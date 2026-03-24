import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { Pool } from "pg";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { notifyAdmin } from "./adminBot";

// ─── UPLOADS DIR ─────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "media_uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── DB SETUP ────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS creators (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id),
      name TEXT NOT NULL,
      telegram TEXT NOT NULL,
      phone TEXT,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      instagram TEXT,
      tiktok TEXT,
      threads TEXT,
      instagram_followers INTEGER DEFAULT 0,
      tiktok_followers INTEGER DEFAULT 0,
      niches TEXT NOT NULL,
      collab_format TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reject_reason TEXT,
      promo_code TEXT UNIQUE,
      referrer_code TEXT,
      points INTEGER DEFAULT 0,
      balance INTEGER DEFAULT 0,
      referral_task_done INTEGER DEFAULT 0,
      youtube TEXT,
      bio TEXT,
      subscribers INTEGER DEFAULT 0,
      categories TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id),
      brand_name TEXT NOT NULL,
      contact TEXT NOT NULL,
      website TEXT NOT NULL,
      category TEXT NOT NULL,
      target_audience TEXT NOT NULL,
      geo TEXT NOT NULL,
      content_format TEXT NOT NULL,
      extra TEXT,
      status TEXT DEFAULT 'pending',
      balance INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      business_id INTEGER REFERENCES businesses(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      product TEXT,
      what_to_show TEXT,
      video_length TEXT,
      style TEXT,
      platform TEXT NOT NULL,
      niches TEXT,
      budget INTEGER DEFAULT 0,
      deadline TEXT,
      language TEXT DEFAULT 'Казахский / Русский',
      post_topics TEXT,
      post_examples TEXT,
      main_idea TEXT,
      start_from TEXT,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      offer_id INTEGER REFERENCES offers(id),
      creator_id INTEGER REFERENCES creators(id),
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(offer_id, creator_id)
    );
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      offer_id INTEGER REFERENCES offers(id),
      creator_id INTEGER REFERENCES creators(id),
      business_id INTEGER REFERENCES businesses(id),
      status TEXT DEFAULT 'new',
      content_url TEXT,
      feedback TEXT,
      revision_count INTEGER DEFAULT 0,
      amount INTEGER DEFAULT 0,
      commission_pct INTEGER DEFAULT 20,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER REFERENCES creators(id),
      referred_id INTEGER UNIQUE REFERENCES creators(id),
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS points_log (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES creators(id),
      action TEXT NOT NULL,
      points INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS support_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS balance_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      details TEXT,
      admin_comment TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      unread_admin INTEGER DEFAULT 0,
      unread_user INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER REFERENCES support_tickets(id),
      sender_role TEXT NOT NULL,
      text TEXT,
      file_url TEXT,
      file_name TEXT,
      file_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      role TEXT DEFAULT 'creator',
      file_url TEXT,
      file_type TEXT,
      file_name TEXT,
      is_voice BOOLEAN DEFAULT FALSE,
      is_video_note BOOLEAN DEFAULT FALSE,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_type TEXT;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_voice BOOLEAN DEFAULT FALSE;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_video_note BOOLEAN DEFAULT FALSE;
    ALTER TABLE chat_messages ALTER COLUMN text DROP NOT NULL;
    CREATE TABLE IF NOT EXISTS news_posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      emoji TEXT DEFAULT '📢',
      pinned INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // migrate existing tables with new columns
  await pool.query(`
    ALTER TABLE creators ADD COLUMN IF NOT EXISTS youtube TEXT;
    ALTER TABLE creators ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE creators ADD COLUMN IF NOT EXISTS subscribers INTEGER DEFAULT 0;
    ALTER TABLE creators ADD COLUMN IF NOT EXISTS categories TEXT;
    ALTER TABLE creators ADD COLUMN IF NOT EXISTS referral_task_done INTEGER DEFAULT 0;
  `).catch(() => {});

  // Permanently guarantee super admin access on every boot
  await pool.query(`
    INSERT INTO users (telegram_id, role)
    VALUES ('6788252183', 'admin')
    ON CONFLICT (telegram_id) DO UPDATE SET role = 'admin'
  `);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const q = (text: string, params?: any[]) => pool.query(text, params);
const one = async (text: string, params?: any[]) => (await pool.query(text, params)).rows[0] ?? null;
const all = async (text: string, params?: any[]) => (await pool.query(text, params)).rows;

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function validateTgData(initData: string): any {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const checkStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(process.env.BOT_TOKEN || "").digest();
    const computed = crypto.createHmac("sha256", secretKey).update(checkStr).digest("hex");
    if (computed !== hash) return null;
    return JSON.parse(params.get("user") || "{}");
  } catch { return null; }
}

function authMiddleware(req: any, res: Response, next: NextFunction) {
  const initData = req.headers["x-telegram-init-data"] as string;
  if (!initData) return res.status(401).json({ error: "Unauthorized" });
  const user = validateTgData(initData);
  if (!user?.id) return res.status(401).json({ error: "Invalid Telegram data" });
  req.tgUser = user;
  next();
}

async function adminOnly(req: any, res: Response, next: NextFunction) {
  const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  req.adminUser = user;
  next();
}

function genPromo(name: string) {
  const base = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "CRTR";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await initDB();

  // ── Static file serving for uploads ──
  const expressModule = await import("express");
  app.use("/uploads", expressModule.default.static(UPLOADS_DIR, {
    maxAge: "30d",
    setHeaders: (res) => { res.setHeader("Cache-Control", "public, max-age=2592000"); }
  }));

  // ── File upload endpoint (raw binary, no multer needed) ──
  app.post("/api/upload", authMiddleware, expressModule.default.raw({ type: "*/*", limit: "12mb" }), async (req: any, res) => {
    try {
      const mimeType = (req.headers["content-type"] || "application/octet-stream").split(";")[0].trim();
      const originalName = decodeURIComponent((req.headers["x-filename"] as string) || "file");
      const ext = originalName.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, safeName);
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: "Empty body" });
      if (req.body.length > 11 * 1024 * 1024) return res.status(413).json({ error: "File too large (max 10MB)" });
      fs.writeFileSync(filePath, req.body);
      const url = `/uploads/${safeName}`;
      res.json({ url, size: req.body.length, mimeType });
    } catch (e) { console.error(e); res.status(500).json({ error: "Upload failed" }); }
  });

  // ── AUTH ──
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const initData = req.headers["x-telegram-init-data"] as string;
      if (!initData) {
        return res.json({ user: null, profile: null, tgUser: null });
      }
      const tgUser = validateTgData(initData);
      if (!tgUser?.id) {
        return res.json({ user: null, profile: null, tgUser: null });
      }
      const tgId = String(tgUser.id);
      let user = await one("SELECT * FROM users WHERE telegram_id=$1", [tgId]);
      if (!user) {
        user = await one("INSERT INTO users (telegram_id, role) VALUES ($1, 'pending') RETURNING *", [tgId]);
      }
      let profile = null;
      if (user.role === "creator") profile = await one("SELECT * FROM creators WHERE user_id=$1", [user.id]);
      else if (user.role === "business") profile = await one("SELECT * FROM businesses WHERE user_id=$1", [user.id]);
      res.json({ user, profile, tgUser });
    } catch (e) { console.error("/login:", e); res.status(500).json({ error: "Server error" }); }
  });

  // ── CREATORS ──
  app.post("/api/creators/register", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { name, telegram, phone, city, country, instagram, tiktok, threads, instagram_followers, tiktok_followers, niches, collab_format, referrer_code } = req.body;
      if (!name || !telegram || !city || !country) return res.status(400).json({ error: "Заполните все обязательные поля" });
      if (!instagram && !tiktok && !threads) return res.status(400).json({ error: "Укажите хотя бы одну социальную сеть" });
      const maxF = Math.max(Number(instagram_followers) || 0, Number(tiktok_followers) || 0);
      if ((instagram || tiktok) && maxF < 1000) return res.status(400).json({ error: "Минимум 1 000 подписчиков в Instagram или TikTok — обязательное условие" });
      const existing = await one("SELECT id FROM creators WHERE user_id=$1", [user.id]);
      if (existing) return res.status(400).json({ error: "Профиль уже существует" });
      const promo = genPromo(name);
      const nichesStr = Array.isArray(niches) ? niches.slice(0, 3).join(",") : niches;
      const creator = await one(
        `INSERT INTO creators (user_id,name,telegram,phone,city,country,instagram,tiktok,threads,instagram_followers,tiktok_followers,niches,collab_format,promo_code,referrer_code,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending') RETURNING *`,
        [user.id, name, telegram, phone || null, city, country, instagram || null, tiktok || null, threads || null, Number(instagram_followers) || 0, Number(tiktok_followers) || 0, nichesStr, collab_format, promo, referrer_code || null]
      );
      await q("UPDATE users SET role=$1 WHERE id=$2", ["creator", user.id]);
      if (referrer_code) {
        const referrer = await one("SELECT * FROM creators WHERE promo_code=$1", [referrer_code]);
        if (referrer) {
          try { await q("INSERT INTO referrals (referrer_id, referred_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [referrer.id, creator.id]); } catch {}
        }
      }
      // Notify admin bot (fire-and-forget)
      const regTime = new Date().toLocaleString("ru-RU", { timeZone: "Asia/Almaty" });
      const socials = [
        instagram   ? `📸 Instagram: @${instagram} (${Number(instagram_followers || 0).toLocaleString()} подп.)` : "",
        tiktok      ? `🎵 TikTok: @${tiktok} (${Number(tiktok_followers || 0).toLocaleString()} подп.)` : "",
        threads     ? `🧵 Threads: @${threads}` : "",
      ].filter(Boolean).join("\n");
      notifyAdmin({
        role: "creator",
        record_id: creator.id,
        text:
          `🆕 <b>Новая регистрация — Креатор</b>\n\n` +
          `👤 Имя: <b>${name}</b>\n` +
          `🆔 Telegram ID: <code>${String(req.tgUser.id)}</code>\n` +
          `📅 Время: ${regTime} (Алматы)\n` +
          `🏙 Город: ${city}, ${country}\n` +
          (socials ? `\n${socials}\n` : "") +
          `🎯 Ниши: ${nichesStr || "—"}\n` +
          `🤝 Формат: ${collab_format || "—"}`,
      }).catch(() => {});
      res.json({ creator });
    } catch (e) { console.error("/creators/register:", e); res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/creators/me", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const creator = await one("SELECT * FROM creators WHERE user_id=$1", [user.id]);
      if (!creator) return res.status(404).json({ error: "Profile not found" });
      const referrals = await one("SELECT COUNT(*) as total, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved FROM referrals WHERE referrer_id=$1", [creator.id]);
      const transactions = await all("SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30", [user.id]);
      const notifications = await all("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20", [user.id]);
      res.json({ creator, referrals, transactions, notifications });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.put("/api/creators/me", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const { name, city, country, instagram, tiktok, threads, youtube, telegram: tgHandle,
        instagram_followers, tiktok_followers, subscribers,
        niches, collab_format, categories, bio, platforms } = req.body;
      await q(`UPDATE creators SET
        name=$1, city=$2, country=$3,
        instagram=$4, tiktok=$5, threads=$6, youtube=$7,
        instagram_followers=$8, tiktok_followers=$9, subscribers=$10,
        niches=$11, collab_format=$12,
        categories=$13, bio=$14
        WHERE user_id=$15`,
        [name, city, country,
         instagram || null, tiktok || null, threads || null, youtube || null,
         Number(instagram_followers) || Number(subscribers) || 0,
         Number(tiktok_followers) || 0,
         Number(subscribers) || 0,
         niches || (Array.isArray(platforms) ? platforms.join(',') : platforms) || '',
         collab_format || '',
         Array.isArray(categories) ? categories.join(',') : (categories || ''),
         bio || null,
         user.id]);
      res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/creators/offers", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const creator = await one("SELECT * FROM creators WHERE user_id=$1", [user?.id]);
      if (!creator || creator.status !== "approved") return res.status(403).json({ error: "Not approved" });
      const cp: string[] = [];
      if (creator.instagram) cp.push("instagram");
      if (creator.tiktok) cp.push("tiktok");
      if (creator.threads) cp.push("threads");
      const offers = await all("SELECT o.*, b.brand_name FROM offers o JOIN businesses b ON o.business_id=b.id WHERE o.status='active' ORDER BY o.created_at DESC");
      const appliedRows = await all("SELECT offer_id FROM applications WHERE creator_id=$1", [creator.id]);
      const applied = appliedRows.map((a: any) => a.offer_id);
      res.json(offers.map(o => ({ ...o, can_apply: cp.includes((o.platform || "").toLowerCase()), applied: applied.includes(o.id) })));
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/creators/offers/:id/apply", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const creator = await one("SELECT * FROM creators WHERE user_id=$1", [user?.id]);
      if (!creator || creator.status !== "approved") return res.status(403).json({ error: "Not approved" });
      const offer = await one("SELECT * FROM offers WHERE id=$1", [req.params.id]);
      if (!offer || offer.status !== "active") return res.status(404).json({ error: "Offer not found" });
      const cp: string[] = [];
      if (creator.instagram) cp.push("instagram");
      if (creator.tiktok) cp.push("tiktok");
      if (creator.threads) cp.push("threads");
      if (!cp.includes((offer.platform || "").toLowerCase())) return res.status(400).json({ error: "Ваша платформа не совпадает" });
      try {
        await q("INSERT INTO applications (offer_id, creator_id, message) VALUES ($1,$2,$3)", [offer.id, creator.id, req.body.message || ""]);
      } catch { return res.status(400).json({ error: "Вы уже откликнулись на этот оффер" }); }
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/creators/projects", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const creator = await one("SELECT * FROM creators WHERE user_id=$1", [user?.id]);
      if (!creator) return res.status(404).json({ error: "Not found" });
      const projects = await all(
        "SELECT p.*, o.title, o.description, o.platform, o.product, o.what_to_show, o.video_length, o.style, o.deadline, b.brand_name FROM projects p JOIN offers o ON p.offer_id=o.id JOIN businesses b ON p.business_id=b.id WHERE p.creator_id=$1 ORDER BY p.created_at DESC",
        [creator.id]
      );
      res.json(projects);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/creators/projects/:id/upload", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const creator = await one("SELECT * FROM creators WHERE user_id=$1", [user?.id]);
      if (!creator) return res.status(403).json({ error: "Forbidden" });
      const project = await one("SELECT * FROM projects WHERE id=$1 AND creator_id=$2", [req.params.id, creator.id]);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (!["in_progress", "revision"].includes(project.status)) return res.status(400).json({ error: "Нельзя загрузить на этом этапе" });
      const { content_url } = req.body;
      if (!content_url) return res.status(400).json({ error: "Укажите ссылку" });
      await q("UPDATE projects SET content_url=$1, status='review', updated_at=NOW() WHERE id=$2", [content_url, project.id]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/creators/points", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const creator = await one("SELECT * FROM creators WHERE user_id=$1", [user?.id]);
      if (!creator || creator.status !== "approved") return res.status(403).json({ error: "Forbidden" });
      const { action } = req.body;
      if (!["like", "comment"].includes(action)) return res.status(400).json({ error: "Invalid action" });
      const pts = action === "comment" ? 30 : 20;
      await q("UPDATE creators SET points = points + $1 WHERE id = $2", [pts, creator.id]);
      await q("INSERT INTO points_log (creator_id, action, points) VALUES ($1,$2,$3)", [creator.id, action, pts]);
      const updated = await one("SELECT points FROM creators WHERE id=$1", [creator.id]);
      res.json({ points: updated.points, added: pts });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/creators/referral-task", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const creator = await one("SELECT * FROM creators WHERE user_id=$1", [user?.id]);
      if (!creator || creator.status !== "approved") return res.status(403).json({ error: "Forbidden" });
      if (creator.referral_task_done) return res.status(400).json({ error: "Задание уже выполнено" });
      const referralCount = await one("SELECT COUNT(*) as n FROM referrals WHERE referrer_id=$1 AND status='approved'", [creator.id]);
      if (Number(referralCount?.n || 0) < 5) return res.status(400).json({ error: "Нужно минимум 5 одобренных рефералов" });
      await q("UPDATE creators SET balance=balance+5000, referral_task_done=1 WHERE id=$1", [creator.id]);
      await q("INSERT INTO transactions (user_id,type,amount,description) VALUES ($1,'bonus',5000,'Реферальное задание — 5 рефералов')", [user.id]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/creators/notifications", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const notifs = await all("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30", [user.id]);
      res.json(notifs);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/creators/notifications/read", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      await q("UPDATE notifications SET is_read=1 WHERE user_id=$1", [user.id]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // ── BALANCE ──
  app.post("/api/balance/request", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const { type, amount, details } = req.body;
      if (!type || !amount) return res.status(400).json({ error: "type and amount required" });
      if (!["topup", "withdraw"].includes(type)) return res.status(400).json({ error: "Invalid type" });
      if (amount < 1000) return res.status(400).json({ error: "Минимальная сумма 1 000 ₸" });
      if (type === "withdraw") {
        let balance = 0;
        if (user.role === "creator") {
          const c = await one("SELECT balance FROM creators WHERE user_id=$1", [user.id]);
          balance = c?.balance || 0;
        }
        if (balance < amount) return res.status(400).json({ error: "Недостаточно средств на балансе" });
      }
      const result = await one(
        "INSERT INTO balance_requests (user_id, type, amount, details) VALUES ($1,$2,$3,$4) RETURNING id",
        [user.id, type, amount, details || null]
      );
      res.json({ ok: true, request_id: result.id });
    } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/balance/my", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const requests = await all("SELECT * FROM balance_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20", [user.id]);
      res.json(requests);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // alias for frontend balanceApi.getInfo()
  app.get("/api/balance", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const requests = await all("SELECT * FROM balance_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20", [user.id]);
      res.json(requests);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // admin: get balance requests with optional status filter
  app.get("/api/balance/admin/requests", authMiddleware, adminOnly, async (req: any, res) => {
    try {
      const status = req.query.status || 'pending';
      const requests = await all(`
        SELECT br.*, u.telegram_id,
          COALESCE(c.name, b.brand_name) as user_name
        FROM balance_requests br
        JOIN users u ON br.user_id = u.id
        LEFT JOIN creators c ON c.user_id = u.id
        LEFT JOIN businesses b ON b.user_id = u.id
        WHERE br.status = $1
        ORDER BY br.created_at ASC
      `, [status]);
      res.json(requests);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/balance/admin/pending", authMiddleware, adminOnly, async (_req, res) => {
    try {
      const requests = await all(`
        SELECT br.*, u.telegram_id,
          COALESCE(c.name, b.brand_name) as user_name
        FROM balance_requests br
        JOIN users u ON br.user_id = u.id
        LEFT JOIN creators c ON c.user_id = u.id
        LEFT JOIN businesses b ON b.user_id = u.id
        WHERE br.status = 'pending'
        ORDER BY br.created_at ASC
      `);
      res.json(requests);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/balance/admin/:id/approve", authMiddleware, adminOnly, async (req, res) => {
    try {
      const request = await one("SELECT * FROM balance_requests WHERE id=$1", [req.params.id]);
      if (!request) return res.status(404).json({ error: "Not found" });
      await q("UPDATE balance_requests SET status='approved' WHERE id=$1", [request.id]);
      const reqUser = await one("SELECT * FROM users WHERE id=$1", [request.user_id]);
      if (request.type === "topup") {
        if (reqUser.role === "creator") await q("UPDATE creators SET balance=balance+$1 WHERE user_id=$2", [request.amount, request.user_id]);
        else if (reqUser.role === "business") await q("UPDATE businesses SET balance=balance+$1 WHERE user_id=$2", [request.amount, request.user_id]);
        await q("INSERT INTO transactions (user_id,type,amount,description) VALUES ($1,'deposit',$2,$3)", [request.user_id, request.amount, `Пополнение баланса #${request.id}`]);
        await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [request.user_id, `✅ Баланс пополнен на ${Number(request.amount).toLocaleString()} ₸`]);
      }
      if (request.type === "withdraw") {
        if (reqUser.role === "creator") await q("UPDATE creators SET balance=balance-$1 WHERE user_id=$2", [request.amount, request.user_id]);
        await q("INSERT INTO transactions (user_id,type,amount,description) VALUES ($1,'withdrawal',$2,$3)", [request.user_id, -request.amount, `Вывод средств #${request.id}`]);
        await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [request.user_id, `✅ Вывод ${Number(request.amount).toLocaleString()} ₸ обработан`]);
      }
      res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/balance/admin/:id/reject", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { comment } = req.body;
      const request = await one("SELECT * FROM balance_requests WHERE id=$1", [req.params.id]);
      if (!request) return res.status(404).json({ error: "Not found" });
      await q("UPDATE balance_requests SET status='rejected', admin_comment=$1 WHERE id=$2", [comment || "", request.id]);
      await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [request.user_id, `❌ Запрос на ${request.type === 'topup' ? 'пополнение' : 'вывод'} отклонён. ${comment || ''}`]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // ── AI SUPPORT ──
  const AI_MODELS = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ];
  let cachedModel: string | null = null;

  async function callAnthropic(apiKey: string, message: string): Promise<string> {
    const SYSTEM = "Ты Jarvis — AI-ассистент платформы CONCEPT ADS — UGC маркетплейс в Казахстане. Помогай пользователям разобраться с платформой: как подать заявку, как работают офферы, как получить оплату, реферальная программа (5 рефералов = 5000 ₸), баллы за активность. Отвечай коротко, по делу, на русском языке.";
    const modelsToTry = cachedModel ? [cachedModel, ...AI_MODELS.filter(m => m !== cachedModel)] : AI_MODELS;

    for (const model of modelsToTry) {
      const body = { model, max_tokens: 1000, system: SYSTEM, messages: [{ role: "user", content: message }] };
      console.log(`AI trying model: ${model}`);
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body)
      });
      const data: any = await resp.json();
      if (resp.ok) {
        cachedModel = model;
        console.log(`AI SUCCESS with model: ${model}`);
        return data.content[0].text;
      }
      if (data?.error?.type === "not_found_error") {
        console.log(`Model ${model} not found, trying next...`);
        if (cachedModel === model) cachedModel = null;
        continue;
      }
      // Non-404 error (rate limit, auth, etc) — don't try more models
      console.error(`AI error with ${model}:`, data);
      throw new Error(data?.error?.message || "AI error");
    }
    throw new Error("No working AI model found");
  }

  app.post("/api/ai/message", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ error: "No message" });
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "AI не настроен" });

      const aiMessage = await callAnthropic(apiKey, message.trim());
      await q("INSERT INTO support_messages (user_id, role, message) VALUES ($1,'user',$2)", [user.id, message.trim()]);
      await q("INSERT INTO support_messages (user_id, role, message) VALUES ($1,'assistant',$2)", [user.id, aiMessage]);
      res.json({ message: aiMessage });
    } catch (e: any) {
      console.error("AI error:", e.message);
      res.status(500).json({ error: "AI временно недоступен. Попробуйте позже." });
    }
  });

  app.get("/api/ai/history", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const messages = await all("SELECT role, message as content, created_at FROM support_messages WHERE user_id=$1 ORDER BY created_at ASC LIMIT 50", [user.id]);
      res.json(messages);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // ── BUSINESS ──
  app.post("/api/business/register", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { brand_name, contact, website, category, target_audience, geo, content_format, extra } = req.body;
      if (!brand_name || !contact || !website || !category || !target_audience || !geo || !content_format) return res.status(400).json({ error: "Заполните все обязательные поля" });
      const existing = await one("SELECT id FROM businesses WHERE user_id=$1", [user.id]);
      if (existing) return res.status(400).json({ error: "Профиль уже существует" });
      const biz = await one(
        "INSERT INTO businesses (user_id,brand_name,contact,website,category,target_audience,geo,content_format,extra) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
        [user.id, brand_name, contact, website, category, target_audience, geo, content_format, extra || null]
      );
      await q("UPDATE users SET role=$1 WHERE id=$2", ["business", user.id]);
      // Notify admin bot (fire-and-forget)
      const regTimeBiz = new Date().toLocaleString("ru-RU", { timeZone: "Asia/Almaty" });
      notifyAdmin({
        role: "business",
        record_id: biz.id,
        text:
          `🆕 <b>Новая регистрация — Бизнес</b>\n\n` +
          `🏢 Бренд: <b>${brand_name}</b>\n` +
          `🆔 Telegram ID: <code>${String(req.tgUser.id)}</code>\n` +
          `📅 Время: ${regTimeBiz} (Алматы)\n` +
          `📋 Категория: ${category}\n` +
          `🌐 Сайт: ${website}\n` +
          `👥 Аудитория: ${target_audience}\n` +
          `📍 Гео: ${geo}\n` +
          `🎬 Формат: ${content_format}` +
          (extra ? `\n📝 Доп. инфо: ${extra}` : ""),
      }).catch(() => {});
      res.json({ business: biz });
    } catch (e) { console.error("/business/register:", e); res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/business/me", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(404).json({ error: "Not found" });
      const biz = await one("SELECT * FROM businesses WHERE user_id=$1", [user.id]);
      if (!biz) return res.status(404).json({ error: "Profile not found" });
      const transactions = await all("SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20", [user.id]);
      res.json({ business: biz, transactions });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/business/offers", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const biz = await one("SELECT * FROM businesses WHERE user_id=$1", [user?.id]);
      if (!biz || biz.status !== "approved") return res.status(403).json({ error: "Not approved" });
      const { title, description, product, what_to_show, video_length, style, platform, niches, budget, deadline } = req.body;
      if (!title || !description || !platform) return res.status(400).json({ error: "Укажите название, описание и платформу" });
      const offer = await one(
        "INSERT INTO offers (business_id,title,description,product,what_to_show,video_length,style,platform,niches,budget,deadline,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft') RETURNING *",
        [biz.id, title, description, product || null, what_to_show || null, video_length || null, style || null, platform.toLowerCase(), niches || null, Number(budget) || 0, deadline || null]
      );
      res.json({ offer });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/business/offers", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const biz = await one("SELECT * FROM businesses WHERE user_id=$1", [user?.id]);
      if (!biz) return res.status(404).json({ error: "Not found" });
      const offers = await all("SELECT * FROM offers WHERE business_id=$1 ORDER BY created_at DESC", [biz.id]);
      res.json(offers);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/business/projects", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const biz = await one("SELECT * FROM businesses WHERE user_id=$1", [user?.id]);
      if (!biz) return res.status(404).json({ error: "Not found" });
      const projects = await all(
        "SELECT p.*, o.title, o.platform, o.deadline, c.name as creator_name, c.instagram, c.tiktok, c.threads FROM projects p JOIN offers o ON p.offer_id=o.id JOIN creators c ON p.creator_id=c.id WHERE p.business_id=$1 ORDER BY p.created_at DESC",
        [biz.id]
      );
      res.json(projects);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/business/projects/:id/review", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      const biz = await one("SELECT * FROM businesses WHERE user_id=$1", [user?.id]);
      if (!biz) return res.status(403).json({ error: "Forbidden" });
      const project = await one("SELECT * FROM projects WHERE id=$1 AND business_id=$2", [req.params.id, biz.id]);
      if (!project) return res.status(404).json({ error: "Not found" });
      if (project.status !== "review") return res.status(400).json({ error: "Проект не на проверке" });
      const { action, feedback } = req.body;
      if (!["approve", "revision"].includes(action)) return res.status(400).json({ error: "Invalid action" });
      if (action === "revision" && project.revision_count >= 3) return res.status(400).json({ error: "Достигнут лимит правок (3)" });
      const newStatus = action === "approve" ? "done" : "revision";
      const newRevCount = action === "revision" ? project.revision_count + 1 : project.revision_count;
      await q("UPDATE projects SET status=$1, feedback=$2, revision_count=$3, updated_at=NOW() WHERE id=$4", [newStatus, feedback || null, newRevCount, project.id]);
      res.json({ ok: true, status: newStatus, revision_count: newRevCount });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // ── ADMIN ──
  app.post("/api/admin/set-admin", async (req, res) => {
    try {
      const { secret, telegram_id } = req.body;
      if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: "Wrong secret" });
      const existing = await one("SELECT id FROM users WHERE telegram_id=$1", [String(telegram_id)]);
      if (existing) {
        await q("UPDATE users SET role='admin' WHERE telegram_id=$1", [String(telegram_id)]);
      } else {
        await q("INSERT INTO users (telegram_id, role) VALUES ($1,'admin') ON CONFLICT DO NOTHING", [String(telegram_id)]);
      }
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/stats", authMiddleware, adminOnly, async (_req, res) => {
    try {
      const stats = await all(`
        SELECT
          (SELECT COUNT(*) FROM creators WHERE status='approved') as creators,
          (SELECT COUNT(*) FROM creators WHERE status='pending') as pending_creators,
          (SELECT COUNT(*) FROM businesses WHERE status='approved') as businesses,
          (SELECT COUNT(*) FROM businesses WHERE status='pending') as pending_businesses,
          (SELECT COUNT(*) FROM projects WHERE status NOT IN ('paid','closed')) as active_projects,
          (SELECT COALESCE(SUM(ABS(amount)),0) FROM transactions WHERE type='commission') as total_commission,
          (SELECT COUNT(*) FROM offers) as total_offers,
          (SELECT COUNT(*) FROM balance_requests WHERE status='pending') as pending_balance_requests
      `);
      res.json(stats[0]);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/creators", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { status = "pending" } = req.query;
      const creators = await all("SELECT c.*, u.telegram_id FROM creators c JOIN users u ON c.user_id=u.id WHERE c.status=$1 ORDER BY c.created_at DESC", [status as string]);
      res.json(creators);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/admin/creators/:id/approve", authMiddleware, adminOnly, async (req, res) => {
    try {
      const creator = await one("SELECT * FROM creators WHERE id=$1", [req.params.id]);
      if (!creator) return res.status(404).json({ error: "Not found" });
      await q("UPDATE creators SET status='approved' WHERE id=$1", [creator.id]);
      if (creator.referrer_code) {
        await q("UPDATE referrals SET status='approved' WHERE referred_id=$1", [creator.id]);
      }
      const user = await one("SELECT * FROM users WHERE id=$1", [creator.user_id]);
      if (user) await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [user.id, "✅ Ваш профиль создателя одобрен! Добро пожаловать в CONCEPT ADS"]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/admin/creators/:id/reject", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { reason } = req.body;
      const creator = await one("SELECT * FROM creators WHERE id=$1", [req.params.id]);
      if (!creator) return res.status(404).json({ error: "Not found" });
      await q("UPDATE creators SET status='rejected', reject_reason=$1 WHERE id=$2", [reason || "", creator.id]);
      const user = await one("SELECT * FROM users WHERE id=$1", [creator.user_id]);
      if (user) await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [user.id, `❌ Заявка отклонена. Причина: ${reason || 'Не указана'}`]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/businesses", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { status = "pending" } = req.query;
      const businesses = await all("SELECT b.*, u.telegram_id FROM businesses b JOIN users u ON b.user_id=u.id WHERE b.status=$1 ORDER BY b.created_at DESC", [status as string]);
      res.json(businesses);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/admin/businesses/:id/approve", authMiddleware, adminOnly, async (req, res) => {
    try {
      const biz = await one("SELECT * FROM businesses WHERE id=$1", [req.params.id]);
      if (!biz) return res.status(404).json({ error: "Not found" });
      await q("UPDATE businesses SET status='approved' WHERE id=$1", [biz.id]);
      const user = await one("SELECT * FROM users WHERE id=$1", [biz.user_id]);
      if (user) await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [user.id, "✅ Ваш бизнес-профиль одобрен! Можете создавать офферы."]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/admin/businesses/:id/reject", authMiddleware, adminOnly, async (req, res) => {
    try {
      await q("UPDATE businesses SET status='rejected' WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/offers", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { status } = req.query;
      const offers = status
        ? await all("SELECT o.*, b.brand_name FROM offers o JOIN businesses b ON o.business_id=b.id WHERE o.status=$1 ORDER BY o.created_at DESC", [status as string])
        : await all("SELECT o.*, b.brand_name FROM offers o JOIN businesses b ON o.business_id=b.id ORDER BY o.created_at DESC");
      res.json(offers);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.put("/api/admin/offers/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { title, description, product, what_to_show, video_length, style, platform, niches, budget, deadline, language, post_topics, post_examples, main_idea, start_from, status } = req.body;
      await q(
        "UPDATE offers SET title=$1,description=$2,product=$3,what_to_show=$4,video_length=$5,style=$6,platform=$7,niches=$8,budget=$9,deadline=$10,language=$11,post_topics=$12,post_examples=$13,main_idea=$14,start_from=$15,status=$16,updated_at=NOW() WHERE id=$17",
        [title, description, product, what_to_show, video_length, style, platform?.toLowerCase(), niches, budget, deadline, language, post_topics, post_examples, main_idea, start_from, status, req.params.id]
      );
      res.json({ ok: true });
    } catch (e) { console.error("/admin/offers PUT:", e); res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/offers/:id/applications", authMiddleware, adminOnly, async (req, res) => {
    try {
      const apps = await all(
        "SELECT a.*, c.name, c.phone, c.instagram, c.tiktok, c.threads, c.instagram_followers, c.tiktok_followers, c.niches, c.collab_format FROM applications a JOIN creators c ON a.creator_id=c.id WHERE a.offer_id=$1 ORDER BY a.created_at DESC",
        [req.params.id]
      );
      res.json(apps);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/admin/applications/:id/select", authMiddleware, adminOnly, async (req, res) => {
    try {
      const application = await one("SELECT * FROM applications WHERE id=$1", [req.params.id]);
      if (!application) return res.status(404).json({ error: "Not found" });
      const offer = await one("SELECT * FROM offers WHERE id=$1", [application.offer_id]);
      await q("UPDATE applications SET status='selected' WHERE id=$1", [application.id]);
      const proj = await one(
        "INSERT INTO projects (offer_id, creator_id, business_id, amount) VALUES ($1,$2,$3,$4) RETURNING id",
        [application.offer_id, application.creator_id, offer.business_id, offer.budget || 0]
      );
      await q("UPDATE offers SET status='in_progress' WHERE id=$1", [offer.id]);
      const creator = await one("SELECT * FROM creators WHERE id=$1", [application.creator_id]);
      if (creator) {
        const user = await one("SELECT * FROM users WHERE id=$1", [creator.user_id]);
        if (user) await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [user.id, `🎉 Вас выбрали для оффера "${offer.title}"! Проект #${proj.id} запущен.`]);
      }
      res.json({ project_id: proj.id, ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/projects", authMiddleware, adminOnly, async (_req, res) => {
    try {
      const projects = await all(
        "SELECT p.*, o.title, o.platform, c.name as creator_name, b.brand_name FROM projects p JOIN offers o ON p.offer_id=o.id JOIN creators c ON p.creator_id=c.id JOIN businesses b ON p.business_id=b.id ORDER BY p.updated_at DESC"
      );
      res.json(projects);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/admin/projects/:id/status", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { status } = req.body;
      const project = await one("SELECT * FROM projects WHERE id=$1", [req.params.id]);
      if (!project) return res.status(404).json({ error: "Not found" });
      await q("UPDATE projects SET status=$1, updated_at=NOW() WHERE id=$2", [status, project.id]);
      if (status === "paid") {
        const commission = Math.floor(project.amount * project.commission_pct / 100);
        const payout = project.amount - commission;
        await q("UPDATE creators SET balance=balance+$1 WHERE id=$2", [payout, project.creator_id]);
        const crRow: any = await one("SELECT u.* FROM creators c JOIN users u ON c.user_id=u.id WHERE c.id=$1", [project.creator_id]);
        if (crRow) {
          await q("INSERT INTO transactions (user_id,type,amount,description) VALUES ($1,'withdrawal',$2,$3)", [crRow.id, payout, `Выплата по проекту #${project.id}`]);
          await q("INSERT INTO transactions (user_id,type,amount,description) VALUES ($1,'commission',$2,$3)", [crRow.id, -commission, `Комиссия платформы 20%`]);
          await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [crRow.id, `💰 Выплата ${payout.toLocaleString()} ₸ за проект #${project.id} начислена`]);
        }
      }
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/referrals", authMiddleware, adminOnly, async (_req, res) => {
    try {
      const referrals = await all(`
        SELECT c.name, c.promo_code, c.phone,
          COUNT(r.id) as total_referred,
          SUM(CASE WHEN r.status='approved' THEN 1 ELSE 0 END) as approved_count
        FROM creators c
        LEFT JOIN referrals r ON r.referrer_id=c.id
        WHERE c.status='approved'
        GROUP BY c.id, c.name, c.promo_code, c.phone
        ORDER BY approved_count DESC
      `);
      res.json(referrals);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // ── Admin detail endpoints ────────────────────────────────────────────────
  app.get("/api/admin/creators/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const creator = await one(
        "SELECT c.*, u.telegram_id FROM creators c JOIN users u ON c.user_id=u.id WHERE c.id=$1",
        [req.params.id]
      );
      if (!creator) return res.status(404).json({ error: "Not found" });
      const projects = await all(
        "SELECT p.*, o.title, o.platform, b.brand_name FROM projects p JOIN offers o ON p.offer_id=o.id JOIN businesses b ON p.business_id=b.id WHERE p.creator_id=$1 ORDER BY p.created_at DESC",
        [creator.id]
      );
      const transactions = await all(
        "SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
        [creator.user_id]
      );
      const referrals = await all(
        "SELECT c2.name, c2.status, c2.created_at FROM referrals r JOIN creators c2 ON r.referred_id=c2.id WHERE r.referrer_id=$1 ORDER BY r.created_at DESC",
        [creator.id]
      );
      res.json({ creator, projects, transactions, referrals });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/businesses/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const business = await one(
        "SELECT b.*, u.telegram_id FROM businesses b JOIN users u ON b.user_id=u.id WHERE b.id=$1",
        [req.params.id]
      );
      if (!business) return res.status(404).json({ error: "Not found" });
      const projects = await all(
        "SELECT p.*, o.title, o.platform, c.name as creator_name FROM projects p JOIN offers o ON p.offer_id=o.id JOIN creators c ON p.creator_id=c.id WHERE p.business_id=$1 ORDER BY p.created_at DESC",
        [business.id]
      );
      const offers = await all(
        "SELECT * FROM offers WHERE business_id=$1 ORDER BY created_at DESC",
        [business.id]
      );
      const transactions = await all(
        "SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
        [business.user_id]
      );
      res.json({ business, projects, offers, transactions });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/admin/projects/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const project = await one(
        `SELECT p.*,
          o.title as offer_title, o.description as offer_description, o.platform, o.budget as offer_budget,
          o.deadline, o.niches, o.language,
          c.name as creator_name, c.phone as creator_phone, c.telegram as creator_telegram, c.id as creator_id,
          b.brand_name, b.contact as business_contact, b.id as business_id
         FROM projects p
         JOIN offers o ON p.offer_id=o.id
         JOIN creators c ON p.creator_id=c.id
         JOIN businesses b ON p.business_id=b.id
         WHERE p.id=$1`,
        [req.params.id]
      );
      if (!project) return res.status(404).json({ error: "Not found" });
      res.json(project);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/admin/balance/adjust", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { telegram_id, amount, type, description } = req.body;
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(telegram_id)]);
      if (!user) return res.status(404).json({ error: "Пользователь не найден" });
      if (user.role === "creator") await q("UPDATE creators SET balance=balance+$1 WHERE user_id=$2", [amount, user.id]);
      else if (user.role === "business") await q("UPDATE businesses SET balance=balance+$1 WHERE user_id=$2", [amount, user.id]);
      await q("INSERT INTO transactions (user_id,type,amount,description) VALUES ($1,$2,$3,$4)", [user.id, type || "adjustment", amount, description || "Корректировка баланса"]);
      await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [user.id, `💳 Баланс скорректирован: ${amount > 0 ? '+' : ''}${Number(amount).toLocaleString()} ₸`]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // ── Support Tickets ──────────────────────────────────────────────────────────
  // Get or create user's ticket for a type (tech/partnership)
  app.get("/api/support/ticket/:type", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(403).json({ error: "Not found" });
      const { type } = req.params;
      if (!['tech', 'partnership'].includes(type)) return res.status(400).json({ error: "Invalid type" });

      let ticket = await one("SELECT * FROM support_tickets WHERE user_id=$1 AND type=$2", [user.id, type]);
      if (!ticket) {
        let name = "Пользователь";
        if (user.role === "creator") { const c = await one("SELECT name FROM creators WHERE user_id=$1", [user.id]); if (c) name = c.name; }
        else if (user.role === "business") { const b = await one("SELECT brand_name FROM businesses WHERE user_id=$1", [user.id]); if (b) name = b.brand_name; }
        ticket = await one("INSERT INTO support_tickets (user_id, user_name, type) VALUES ($1,$2,$3) RETURNING *", [user.id, name, type]);
      }
      // Mark user messages as read
      await q("UPDATE support_tickets SET unread_user=0 WHERE id=$1", [ticket.id]);
      const messages = await all("SELECT * FROM ticket_messages WHERE ticket_id=$1 ORDER BY created_at ASC", [ticket.id]);
      res.json({ ticket, messages });
    } catch (e) { console.error(e); res.status(500).json({ error: "Server error" }); }
  });

  // Send message in ticket (user)
  app.post("/api/support/ticket/:type/message", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(403).json({ error: "Not found" });
      const { type } = req.params;
      const { text, file_url, file_name, file_type } = req.body;
      if (!text?.trim() && !file_url) return res.status(400).json({ error: "Empty message" });

      let ticket = await one("SELECT * FROM support_tickets WHERE user_id=$1 AND type=$2", [user.id, type]);
      if (!ticket) {
        let name = "Пользователь";
        if (user.role === "creator") { const c = await one("SELECT name FROM creators WHERE user_id=$1", [user.id]); if (c) name = c.name; }
        else if (user.role === "business") { const b = await one("SELECT brand_name FROM businesses WHERE user_id=$1", [user.id]); if (b) name = b.brand_name; }
        ticket = await one("INSERT INTO support_tickets (user_id, user_name, type) VALUES ($1,$2,$3) RETURNING *", [user.id, name, type]);
      }
      const msg = await one(
        "INSERT INTO ticket_messages (ticket_id, sender_role, text, file_url, file_name, file_type) VALUES ($1,'user',$2,$3,$4,$5) RETURNING *",
        [ticket.id, text?.trim() || null, file_url || null, file_name || null, file_type || null]
      );
      await q("UPDATE support_tickets SET updated_at=NOW(), unread_admin=unread_admin+1 WHERE id=$1", [ticket.id]);
      res.json(msg);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // Admin: get all tickets
  app.get("/api/admin/support/tickets", authMiddleware, adminOnly, async (_req, res) => {
    try {
      const tickets = await all(`
        SELECT t.*, 
          (SELECT text FROM ticket_messages WHERE ticket_id=t.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM ticket_messages WHERE ticket_id=t.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM support_tickets t
        ORDER BY t.updated_at DESC
      `);
      res.json(tickets);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // Admin: get ticket messages
  app.get("/api/admin/support/tickets/:id/messages", authMiddleware, adminOnly, async (req, res) => {
    try {
      await q("UPDATE support_tickets SET unread_admin=0 WHERE id=$1", [req.params.id]);
      const messages = await all("SELECT * FROM ticket_messages WHERE ticket_id=$1 ORDER BY created_at ASC", [req.params.id]);
      const ticket = await one("SELECT * FROM support_tickets WHERE id=$1", [req.params.id]);
      res.json({ ticket, messages });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // Admin: reply to ticket
  app.post("/api/admin/support/tickets/:id/reply", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { text, file_url, file_name, file_type } = req.body;
      if (!text?.trim() && !file_url) return res.status(400).json({ error: "Empty" });
      const ticket = await one("SELECT * FROM support_tickets WHERE id=$1", [req.params.id]);
      if (!ticket) return res.status(404).json({ error: "Not found" });
      const msg = await one(
        "INSERT INTO ticket_messages (ticket_id, sender_role, text, file_url, file_name, file_type) VALUES ($1,'admin',$2,$3,$4,$5) RETURNING *",
        [ticket.id, text?.trim() || null, file_url || null, file_name || null, file_type || null]
      );
      await q("UPDATE support_tickets SET updated_at=NOW(), unread_user=unread_user+1, status='answered' WHERE id=$1", [ticket.id]);
      await q("INSERT INTO notifications (user_id, message) VALUES ($1,$2)", [ticket.user_id, `💬 Новый ответ от поддержки CONCEPT`]);
      res.json(msg);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // Admin: close ticket
  app.post("/api/admin/support/tickets/:id/close", authMiddleware, adminOnly, async (req, res) => {
    try {
      await q("UPDATE support_tickets SET status='closed' WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // ── Community Chat ──────────────────────────────────────────────────────────
  app.get("/api/community/messages", authMiddleware, async (req: any, res) => {
    try {
      const { before_id } = req.query;
      const msgs = before_id
        ? await all("SELECT * FROM chat_messages WHERE id < $1 ORDER BY id DESC LIMIT 50", [before_id])
        : await all("SELECT * FROM chat_messages ORDER BY id DESC LIMIT 50", []);
      res.json(msgs.reverse());
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/community/messages", authMiddleware, async (req: any, res) => {
    try {
      const user = await one("SELECT * FROM users WHERE telegram_id=$1", [String(req.tgUser.id)]);
      if (!user) return res.status(403).json({ error: "Not found" });
      const { text, file_url, file_type, file_name, is_voice, is_video_note } = req.body;
      if (!text?.trim() && !file_url) return res.status(400).json({ error: "Empty message" });
      if (text && text.length > 1000) return res.status(400).json({ error: "Too long" });

      let name = "Пользователь";
      if (user.role === "creator") {
        const c = await one("SELECT name FROM creators WHERE user_id=$1", [user.id]);
        if (c) name = c.name;
      } else if (user.role === "business") {
        const b = await one("SELECT brand_name FROM businesses WHERE user_id=$1", [user.id]);
        if (b) name = b.brand_name;
      } else if (user.role === "admin") {
        name = "Admin";
      }

      const msg = await one(
        "INSERT INTO chat_messages (user_id, name, role, text, file_url, file_type, file_name, is_voice, is_video_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
        [user.id, name, user.role, text?.trim() || null, file_url || null, file_type || null, file_name || null, !!is_voice, !!is_video_note]
      );
      res.json(msg);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/community/messages/new", authMiddleware, async (req: any, res) => {
    try {
      const afterId = parseInt(req.query.after_id as string);
      const msgs = !isNaN(afterId)
        ? await all("SELECT * FROM chat_messages WHERE id > $1 ORDER BY id ASC LIMIT 50", [afterId])
        : [];
      res.json(msgs);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  // ── News Feed ────────────────────────────────────────────────────────────────
  app.get("/api/news", authMiddleware, async (_req, res) => {
    try {
      const posts = await all("SELECT * FROM news_posts ORDER BY pinned DESC, created_at DESC LIMIT 50", []);
      res.json(posts);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/admin/news", authMiddleware, adminOnly, async (req: any, res) => {
    try {
      const { title, body, emoji, pinned } = req.body;
      if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: "Title and body required" });
      const post = await one(
        "INSERT INTO news_posts (title, body, emoji, pinned, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [title.trim(), body.trim(), emoji || "📢", pinned ? 1 : 0, req.adminUser.id]
      );
      res.json(post);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.delete("/api/admin/news/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      await q("DELETE FROM news_posts WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  app.patch("/api/admin/news/:id/pin", authMiddleware, adminOnly, async (req, res) => {
    try {
      const post = await one("SELECT pinned FROM news_posts WHERE id=$1", [req.params.id]);
      if (!post) return res.status(404).json({ error: "Not found" });
      await q("UPDATE news_posts SET pinned=$1 WHERE id=$2", [post.pinned ? 0 : 1, req.params.id]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
  });

  return httpServer;
}
