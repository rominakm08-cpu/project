const router = require('express').Router();
const db = require('../db/schema');
const auth = require('../middleware/auth');

router.post('/login', auth, (req, res) => {
  try {
    const tgId = String(req.tgUser.id);
    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(tgId);
    if (!user) {
      db.prepare('INSERT INTO users (telegram_id, role) VALUES (?, ?)').run(tgId, 'pending');
      user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(tgId);
    }
    let profile = null;
    if (user.role === 'creator') {
      profile = db.prepare('SELECT * FROM creators WHERE user_id = ?').get(user.id);
    } else if (user.role === 'business') {
      profile = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(user.id);
    }
    res.json({ user, profile, tgUser: req.tgUser });
  } catch (e) {
    console.error('/login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
