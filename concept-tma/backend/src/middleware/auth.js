const crypto = require('crypto');
require('dotenv').config();

function validateTgData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const checkStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN)
      .digest();
    const computed = crypto
      .createHmac('sha256', secretKey)
      .update(checkStr)
      .digest('hex');
    if (computed !== hash) return null;
    return JSON.parse(params.get('user') || '{}');
  } catch {
    return null;
  }
}

function auth(req, res, next) {
  // Dev bypass
  if (process.env.NODE_ENV === 'development') {
    const testUser = req.headers['x-test-user'];
    if (testUser) {
      try {
        req.tgUser = JSON.parse(testUser);
        return next();
      } catch {}
    }
  }
  const initData = req.headers['x-telegram-init-data'];
  if (!initData) return res.status(401).json({ error: 'Unauthorized' });
  const user = validateTgData(initData);
  if (!user || !user.id) return res.status(401).json({ error: 'Invalid Telegram data' });
  req.tgUser = user;
  next();
}

module.exports = auth;
