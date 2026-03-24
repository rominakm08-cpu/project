require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const APP_URL = process.env.APP_URL || 'https://your-app.railway.app';

function appBtn(text = '📱 Открыть CONCEPT ADS') {
  return {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text, web_app: { url: APP_URL } }]]
    }
  };
}

async function send(chatId, text, extra = {}) {
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...extra });
  } catch (e) {
    console.error(`[Bot] Failed to send to ${chatId}:`, e.message);
  }
}

async function notifyAdmin(text) {
  const adminId = process.env.ADMIN_TG_ID;
  if (!adminId) return;
  await send(adminId, text);
}

// /start command
bot.onText(/\/start/, async (msg) => {
  await send(msg.chat.id,
    `👋 Добро пожаловать в <b>CONCEPT ADS</b>!\n\n` +
    `🎯 UGC-маркетплейс для брендов и креаторов Казахстана.\n\n` +
    `Нажмите кнопку чтобы открыть платформу:`,
    appBtn('🚀 Открыть CONCEPT ADS')
  );
});

bot.onText(/\/help/, async (msg) => {
  await send(msg.chat.id,
    `❓ <b>Помощь</b>\n\nПо вопросам обращайтесь: @Jamaal_concept`,
    appBtn()
  );
});

module.exports = {
  bot,

  async creatorApproved(tgId, promoCode) {
    await send(tgId,
      `✅ <b>Заявка одобрена!</b>\n\n` +
      `Добро пожаловать в CONCEPT ADS 🎉\n\n` +
      `🔑 Ваш реферальный промокод:\n<code>${promoCode}</code>\n\n` +
      `Пригласите 5 друзей-креаторов и получите <b>5 000 ₸</b>`,
      appBtn('📱 Открыть личный кабинет')
    );
  },

  async creatorRejected(tgId, reason) {
    await send(tgId,
      `❌ <b>Заявка отклонена</b>\n\n` +
      `Причина: ${reason || 'Не соответствует требованиям платформы'}\n\n` +
      `Улучшите показатели и попробуйте снова.`
    );
  },

  async newOffer(tgId, offerTitle, platform) {
    await send(tgId,
      `🔔 <b>Новый оффер!</b>\n\n` +
      `📋 ${offerTitle}\n` +
      `📱 Платформа: ${platform}\n\n` +
      `Откройте приложение чтобы откликнуться:`,
      appBtn('📱 Смотреть офферы')
    );
  },

  async projectStatusChanged(tgId, status, title) {
    const statusText = {
      in_progress: '▶️ Проект взят в работу',
      review: '👀 Контент на проверке у бизнеса',
      revision: '✏️ Бизнес запросил правки',
      done: '✅ Контент принят!',
      paid: '💰 Оплата поступила на ваш баланс',
      closed: '🏁 Проект закрыт'
    };
    await send(tgId,
      `${statusText[status] || '📊 Статус проекта изменён'}\n\n` +
      `Проект: <b>${title}</b>\n\nОткройте приложение для деталей:`,
      appBtn()
    );
  },

  async contentUploaded(tgId, creatorName, offerTitle) {
    await send(tgId,
      `📤 <b>Контент загружен!</b>\n\n` +
      `Креатор <b>${creatorName}</b> загрузил работу по проекту <b>${offerTitle}</b>\n\n` +
      `Проверьте и подтвердите или запросите правки:`,
      appBtn('📱 Проверить контент')
    );
  },

  async projectClosed(creatorTgId, businessTgId, title) {
    const msg = `🏁 <b>Проект завершён!</b>\n\nПроект: <b>${title}</b>`;
    if (creatorTgId) await send(creatorTgId, msg, appBtn());
    if (businessTgId) await send(businessTgId, msg, appBtn());
  },

  async referralBonus(tgId, count) {
    await send(tgId,
      `🎁 <b>Реферальный бонус!</b>\n\n` +
      `Вы привлекли ${count} одобренных креатора(ов).\n` +
      `Бонус <b>5 000 ₸</b> будет выплачен вам в течение 3 рабочих дней через Kaspi.`
    );
  },

  async adminNewCreator(name, username) {
    await notifyAdmin(
      `👤 <b>Новая заявка — Креатор</b>\n\n` +
      `Имя: ${name}\n` +
      `TG: @${username || 'не указан'}\n\n` +
      `Откройте панель для модерации.`
    );
  },

  async adminNewBusiness(brandName, contact) {
    await notifyAdmin(
      `🏢 <b>Новая заявка — Бизнес</b>\n\n` +
      `Бренд: ${brandName}\n` +
      `Контакт: ${contact}\n\n` +
      `Откройте панель для модерации.`
    );
  },

  async adminReferralReady(referrerName, promoCode) {
    await notifyAdmin(
      `💰 <b>Реферальная выплата!</b>\n\n` +
      `Креатор: <b>${referrerName}</b>\n` +
      `Промокод: <code>${promoCode}</code>\n\n` +
      `Достигнуто 5 одобренных рефералов. Выплатить <b>5 000 ₸</b> через Kaspi.`
    );
  }
};
