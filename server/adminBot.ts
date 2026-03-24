import TelegramBot from "node-telegram-bot-api";
import { Pool } from "pg";

const SUPER_ADMIN_ID = "6788252183";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

async function q(sql: string, params: any[] = []) {
  return pool.query(sql, params);
}

async function one(sql: string, params: any[] = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function isAdmin(telegramId: string): Promise<boolean> {
  const user = await one(
    "SELECT role FROM users WHERE telegram_id=$1",
    [telegramId]
  );
  return user?.role === "admin";
}

// Module-level bot instance so notifyAdmin can use it
let botInstance: TelegramBot | null = null;

// Called from routes.ts after creator/business registration
export async function notifyAdmin(info: {
  text: string;               // pre-formatted HTML message
  role: "creator" | "business";
  record_id: number;
}) {
  if (!botInstance) return;
  try {
    await botInstance.sendMessage(SUPER_ADMIN_ID, info.text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Одобрить", callback_data: `approve_${info.role}_${info.record_id}` },
          { text: "❌ Отклонить", callback_data: `reject_${info.role}_${info.record_id}` },
        ]],
      },
    });
  } catch (e: any) {
    console.error("[adminBot] notifyAdmin error:", e?.message);
  }
}

export function startAdminBot() {
  const token = process.env.ADMIN_BOT_TOKEN;
  if (!token) {
    console.log("[adminBot] ADMIN_BOT_TOKEN not set, skipping admin bot");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[adminBot] Skipping admin bot polling in development mode");
    return;
  }

  const bot = new TelegramBot(token, { polling: true });
  botInstance = bot;
  console.log("[adminBot] Admin bot started polling");

  // ── /start ──────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);
    const ok = await isAdmin(userId);
    if (!ok) {
      return bot.sendMessage(chatId, "⛔ У вас нет доступа к этому боту.");
    }
    bot.sendMessage(
      chatId,
      `👋 Добро пожаловать в панель администратора CONCEPT ADS!\n\n` +
      `Доступные команды:\n` +
      `/stats — Статистика платформы\n` +
      `/users — Последние пользователи с деталями\n` +
      `/approve [telegram_id] — Одобрить креатора или бизнес\n` +
      `/reject [telegram_id] [причина] — Отклонить (причина необязательна)\n` +
      `/balance [telegram_id] [сумма] — Изменить баланс пользователя\n` +
      (userId === SUPER_ADMIN_ID
        ? `/addadmin [telegram_id] — Выдать права администратора\n` +
          `/removeadmin [telegram_id] — Убрать права администратора`
        : "")
    );
  });

  // ── /stats ──────────────────────────────────────────────────────────────────
  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);
    if (!(await isAdmin(userId))) {
      return bot.sendMessage(chatId, "⛔ Нет доступа.");
    }
    try {
      const { rows } = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM creators WHERE status='approved') as creators,
          (SELECT COUNT(*) FROM creators WHERE status='pending') as pending_creators,
          (SELECT COUNT(*) FROM businesses WHERE status='approved') as businesses,
          (SELECT COUNT(*) FROM businesses WHERE status='pending') as pending_businesses,
          (SELECT COUNT(*) FROM projects WHERE status NOT IN ('paid','closed')) as active_projects,
          (SELECT COUNT(*) FROM offers) as total_offers,
          (SELECT COUNT(*) FROM balance_requests WHERE status='pending') as pending_balance
      `);
      const s = rows[0];
      bot.sendMessage(
        chatId,
        `📊 <b>Статистика CONCEPT ADS</b>\n\n` +
        `👥 Креаторов одобрено: <b>${s.creators}</b>\n` +
        `⏳ Креаторов на проверке: <b>${s.pending_creators}</b>\n` +
        `🏢 Бизнесов одобрено: <b>${s.businesses}</b>\n` +
        `⏳ Бизнесов на проверке: <b>${s.pending_businesses}</b>\n` +
        `🎬 Активных проектов: <b>${s.active_projects}</b>\n` +
        `📋 Всего офферов: <b>${s.total_offers}</b>\n` +
        `💰 Заявок на баланс (ожидают): <b>${s.pending_balance}</b>`,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      bot.sendMessage(chatId, "❌ Ошибка получения статистики.");
    }
  });

  // ── /users ──────────────────────────────────────────────────────────────────
  bot.onText(/\/users/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);
    if (!(await isAdmin(userId))) {
      return bot.sendMessage(chatId, "⛔ Нет доступа.");
    }
    try {
      const { rows } = await pool.query(`
        SELECT
          u.telegram_id, u.role, u.created_at,
          c.name        as c_name,
          c.telegram    as c_telegram,
          c.city        as c_city,
          c.instagram   as c_instagram,
          c.tiktok      as c_tiktok,
          c.threads     as c_threads,
          c.youtube     as c_youtube,
          c.instagram_followers,
          c.tiktok_followers,
          c.status      as c_status,
          b.brand_name  as b_name,
          b.contact     as b_contact,
          b.website     as b_website,
          b.category    as b_category,
          b.status      as b_status
        FROM users u
        LEFT JOIN creators  c ON c.user_id = u.id
        LEFT JOIN businesses b ON b.user_id = u.id
        ORDER BY u.created_at DESC
        LIMIT 15
      `);
      if (!rows.length) return bot.sendMessage(chatId, "Пользователей нет.");

      const lines = rows.map((r: any) => {
        const dt = new Date(r.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" });
        if (r.role === "creator" && r.c_name) {
          const socials = [
            r.c_instagram ? `📸 Instagram: @${r.c_instagram} (${(r.instagram_followers || 0).toLocaleString()})` : "",
            r.c_tiktok    ? `🎵 TikTok: @${r.c_tiktok} (${(r.tiktok_followers || 0).toLocaleString()})` : "",
            r.c_threads   ? `🧵 Threads: @${r.c_threads}` : "",
            r.c_youtube   ? `▶️ YouTube: ${r.c_youtube}` : "",
          ].filter(Boolean).join("\n  ");
          return (
            `👤 <b>${r.c_name}</b> [${r.c_status || "pending"}]\n` +
            `  🆔 ${r.telegram_id} | 📅 ${dt}\n` +
            `  🏙 ${r.c_city || "—"}` +
            (socials ? `\n  ${socials}` : "")
          );
        } else if (r.role === "business" && r.b_name) {
          return (
            `🏢 <b>${r.b_name}</b> [${r.b_status || "pending"}]\n` +
            `  🆔 ${r.telegram_id} | 📅 ${dt}\n` +
            `  📋 ${r.b_category || "—"} | 🌐 ${r.b_website || "—"}`
          );
        } else {
          return `⏳ <b>${r.telegram_id}</b> [${r.role}] — ${dt}`;
        }
      });

      bot.sendMessage(
        chatId,
        `👥 <b>Последние 15 пользователей:</b>\n\n${lines.join("\n\n")}`,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      bot.sendMessage(chatId, "❌ Ошибка получения пользователей.");
    }
  });

  // ── /balance ─────────────────────────────────────────────────────────────────
  bot.onText(/\/balance (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);
    if (!(await isAdmin(userId))) {
      return bot.sendMessage(chatId, "⛔ Нет доступа.");
    }
    const parts = (match?.[1] || "").trim().split(/\s+/);
    if (parts.length < 2) {
      return bot.sendMessage(chatId, "Использование: /balance [telegram_id] [сумма]\nПример: /balance 123456789 5000");
    }
    const [targetId, amountStr] = parts;
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount)) {
      return bot.sendMessage(chatId, "❌ Сумма должна быть числом.");
    }
    try {
      const targetUser = await one("SELECT * FROM users WHERE telegram_id=$1", [targetId]);
      if (!targetUser) return bot.sendMessage(chatId, "❌ Пользователь не найден.");

      let updated = false;
      if (targetUser.role === "creator") {
        await q("UPDATE creators SET balance=balance+$1 WHERE user_id=$2", [amount, targetUser.id]);
        await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [
          targetUser.id,
          amount > 0
            ? `💰 Администратор начислил вам ${amount.toLocaleString()} ₸`
            : `💸 Администратор списал ${Math.abs(amount).toLocaleString()} ₸`
        ]);
        updated = true;
      } else if (targetUser.role === "business") {
        await q("UPDATE businesses SET balance=balance+$1 WHERE user_id=$2", [amount, targetUser.id]);
        updated = true;
      }

      if (!updated) return bot.sendMessage(chatId, "❌ У пользователя нет профиля (не зарегистрирован как creator/business).");

      const sign = amount >= 0 ? "+" : "";
      bot.sendMessage(
        chatId,
        `✅ Баланс пользователя <b>${targetId}</b> изменён на <b>${sign}${amount.toLocaleString()} ₸</b>`,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      console.error("[adminBot] /balance error:", e);
      bot.sendMessage(chatId, "❌ Ошибка изменения баланса.");
    }
  });

  // ── /approve ─────────────────────────────────────────────────────────────────
  bot.onText(/\/approve (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);
    if (!(await isAdmin(userId))) return bot.sendMessage(chatId, "⛔ Нет доступа.");
    const targetId = (match?.[1] || "").trim();
    try {
      const targetUser = await one("SELECT * FROM users WHERE telegram_id=$1", [targetId]);
      if (!targetUser) return bot.sendMessage(chatId, `❌ Пользователь ${targetId} не найден.`);

      if (targetUser.role === "creator") {
        const creator = await one("SELECT * FROM creators WHERE user_id=$1", [targetUser.id]);
        if (!creator) return bot.sendMessage(chatId, "❌ Профиль креатора не найден.");
        if (creator.status === "approved") return bot.sendMessage(chatId, "ℹ️ Креатор уже одобрен.");
        await q("UPDATE creators SET status='approved' WHERE id=$1", [creator.id]);
        await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [
          targetUser.id, "✅ Ваш профиль одобрен! Добро пожаловать в CONCEPT ADS"
        ]);
        return bot.sendMessage(chatId,
          `✅ Креатор <b>${creator.name}</b> (${targetId}) одобрен.`, { parse_mode: "HTML" }
        );
      }

      if (targetUser.role === "business") {
        const biz = await one("SELECT * FROM businesses WHERE user_id=$1", [targetUser.id]);
        if (!biz) return bot.sendMessage(chatId, "❌ Профиль бизнеса не найден.");
        if (biz.status === "approved") return bot.sendMessage(chatId, "ℹ️ Бизнес уже одобрен.");
        await q("UPDATE businesses SET status='approved' WHERE id=$1", [biz.id]);
        await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [
          targetUser.id, "✅ Ваш бизнес-профиль одобрен! Можете создавать офферы."
        ]);
        return bot.sendMessage(chatId,
          `✅ Бизнес <b>${biz.brand_name}</b> (${targetId}) одобрен.`, { parse_mode: "HTML" }
        );
      }

      return bot.sendMessage(chatId, `❌ Пользователь ${targetId} не является креатором или бизнесом (роль: ${targetUser.role}).`);
    } catch (e) {
      console.error("[adminBot] /approve error:", e);
      bot.sendMessage(chatId, "❌ Ошибка одобрения.");
    }
  });

  // ── /reject ──────────────────────────────────────────────────────────────────
  bot.onText(/\/reject (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);
    if (!(await isAdmin(userId))) return bot.sendMessage(chatId, "⛔ Нет доступа.");
    const parts = (match?.[1] || "").trim().split(/\s+/);
    const targetId = parts[0];
    const reason = parts.slice(1).join(" ") || "Отклонено администратором";
    try {
      const targetUser = await one("SELECT * FROM users WHERE telegram_id=$1", [targetId]);
      if (!targetUser) return bot.sendMessage(chatId, `❌ Пользователь ${targetId} не найден.`);

      if (targetUser.role === "creator") {
        const creator = await one("SELECT * FROM creators WHERE user_id=$1", [targetUser.id]);
        if (!creator) return bot.sendMessage(chatId, "❌ Профиль креатора не найден.");
        await q("UPDATE creators SET status='rejected', reject_reason=$1 WHERE id=$2", [reason, creator.id]);
        await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [
          targetUser.id, `❌ Ваша заявка отклонена. Причина: ${reason}`
        ]);
        return bot.sendMessage(chatId,
          `❌ Креатор <b>${creator.name}</b> (${targetId}) отклонён.\nПричина: ${reason}`, { parse_mode: "HTML" }
        );
      }

      if (targetUser.role === "business") {
        const biz = await one("SELECT * FROM businesses WHERE user_id=$1", [targetUser.id]);
        if (!biz) return bot.sendMessage(chatId, "❌ Профиль бизнеса не найден.");
        await q("UPDATE businesses SET status='rejected' WHERE id=$1", [biz.id]);
        await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [
          targetUser.id, `❌ Ваша заявка отклонена. Причина: ${reason}`
        ]);
        return bot.sendMessage(chatId,
          `❌ Бизнес <b>${biz.brand_name}</b> (${targetId}) отклонён.\nПричина: ${reason}`, { parse_mode: "HTML" }
        );
      }

      return bot.sendMessage(chatId, `❌ Пользователь ${targetId} не является креатором или бизнесом.`);
    } catch (e) {
      console.error("[adminBot] /reject error:", e);
      bot.sendMessage(chatId, "❌ Ошибка отклонения.");
    }
  });

  // ── /addadmin ────────────────────────────────────────────────────────────────
  bot.onText(/\/addadmin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);
    if (userId !== SUPER_ADMIN_ID) {
      return bot.sendMessage(chatId, "⛔ Только суперадмин может выдавать права администратора.");
    }
    const targetId = (match?.[1] || "").trim();
    if (!targetId) return bot.sendMessage(chatId, "Укажите telegram_id: /addadmin [telegram_id]");
    try {
      const existing = await one("SELECT id FROM users WHERE telegram_id=$1", [targetId]);
      if (existing) {
        await q("UPDATE users SET role='admin' WHERE telegram_id=$1", [targetId]);
      } else {
        await q("INSERT INTO users (telegram_id, role) VALUES ($1, 'admin')", [targetId]);
      }
      bot.sendMessage(chatId, `✅ Пользователь <b>${targetId}</b> теперь администратор.`, { parse_mode: "HTML" });
    } catch (e) {
      bot.sendMessage(chatId, "❌ Ошибка.");
    }
  });

  // ── /removeadmin ─────────────────────────────────────────────────────────────
  bot.onText(/\/removeadmin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);
    if (userId !== SUPER_ADMIN_ID) {
      return bot.sendMessage(chatId, "⛔ Только суперадмин может убирать права администратора.");
    }
    const targetId = (match?.[1] || "").trim();
    if (targetId === SUPER_ADMIN_ID) {
      return bot.sendMessage(chatId, "⛔ Нельзя убрать права у суперадмина.");
    }
    if (!targetId) return bot.sendMessage(chatId, "Укажите telegram_id: /removeadmin [telegram_id]");
    try {
      await q("UPDATE users SET role='pending' WHERE telegram_id=$1", [targetId]);
      bot.sendMessage(chatId, `✅ Права администратора убраны у <b>${targetId}</b>.`, { parse_mode: "HTML" });
    } catch (e) {
      bot.sendMessage(chatId, "❌ Ошибка.");
    }
  });

  // ── Inline button callbacks (Approve / Reject) ────────────────────────────
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const userId = String(query.from.id);
    const data = query.data || "";

    if (!(await isAdmin(userId))) {
      await bot.answerCallbackQuery(query.id, { text: "⛔ Нет доступа." });
      return;
    }

    const parts = data.split("_");
    if (parts.length < 3) return;
    const action = parts[0];
    const role = parts[1] as "creator" | "business";
    const recordId = parseInt(parts[2]);

    if (isNaN(recordId)) return;

    try {
      if (action === "approve") {
        if (role === "creator") {
          await q("UPDATE creators SET status='approved' WHERE id=$1", [recordId]);
          const creator = await one("SELECT user_id FROM creators WHERE id=$1", [recordId]);
          if (creator) {
            await q(
              "INSERT INTO notifications (user_id, message) VALUES ($1,$2)",
              [creator.user_id, "✅ Ваш профиль одобрен! Добро пожаловать в CONCEPT ADS"]
            );
          }
        } else if (role === "business") {
          await q("UPDATE businesses SET status='approved' WHERE id=$1", [recordId]);
          const biz = await one("SELECT user_id FROM businesses WHERE id=$1", [recordId]);
          if (biz) {
            await q(
              "INSERT INTO notifications (user_id, message) VALUES ($1,$2)",
              [biz.user_id, "✅ Ваш бизнес-профиль одобрен! Можете создавать офферы."]
            );
          }
        }
        await bot.answerCallbackQuery(query.id, { text: "✅ Одобрено!" });
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [[{ text: "✅ Одобрено", callback_data: "done" }]] },
          { chat_id: chatId, message_id: messageId }
        );

      } else if (action === "reject") {
        if (role === "creator") {
          await q(
            "UPDATE creators SET status='rejected', reject_reason=$1 WHERE id=$2",
            ["Отклонено администратором", recordId]
          );
          const creator = await one("SELECT user_id FROM creators WHERE id=$1", [recordId]);
          if (creator) {
            await q(
              "INSERT INTO notifications (user_id, message) VALUES ($1,$2)",
              [creator.user_id, "❌ Ваша заявка отклонена. Для вопросов обратитесь к Jarvis"]
            );
          }
        } else if (role === "business") {
          await q("UPDATE businesses SET status='rejected' WHERE id=$1", [recordId]);
          const biz = await one("SELECT user_id FROM businesses WHERE id=$1", [recordId]);
          if (biz) {
            await q(
              "INSERT INTO notifications (user_id, message) VALUES ($1,$2)",
              [biz.user_id, "❌ Ваша заявка отклонена. Для вопросов обратитесь к Jarvis"]
            );
          }
        }
        await bot.answerCallbackQuery(query.id, { text: "❌ Отклонено." });
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [[{ text: "❌ Отклонено", callback_data: "done" }]] },
          { chat_id: chatId, message_id: messageId }
        );
      }
    } catch (e: any) {
      console.error("[adminBot] callback_query error:", e?.message);
      await bot.answerCallbackQuery(query.id, { text: "❌ Ошибка. Попробуйте ещё раз." });
    }
  });

  bot.on("polling_error", (err) => {
    console.error("[adminBot] polling error:", err.message);
  });
}
