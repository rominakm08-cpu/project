const router = require('express').Router();
const db = require('../db/schema');
const auth = require('../middleware/auth');
const bot = require('../bot');

function genPromo(name) {
  const base = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'CRTR';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

function getUser(tgId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(tgId));
}

// POST /creators/register
router.post('/register', auth, (req, res) => {
  try {
    const tgId = String(req.tgUser.id);
    const user = getUser(tgId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const {
      name, telegram, phone, city, country,
      instagram, tiktok, threads,
      instagram_followers, tiktok_followers,
      niches, collab_format, referrer_code
    } = req.body;

    // Validation
    if (!name || !telegram || !city || !country) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    if (!instagram && !tiktok && !threads) {
      return res.status(400).json({ error: 'Укажите хотя бы одну социальную сеть' });
    }

    // Threads не требует подписчиков - проверяем только Instagram и TikTok
    const maxFollowers = Math.max(
      Number(instagram_followers) || 0,
      Number(tiktok_followers) || 0
    );
    const hasInstOrTik = instagram || tiktok;
    if (hasInstOrTik && maxFollowers < 1000) {
      return res.status(400).json({
        error: 'Минимум 1 000 подписчиков в Instagram или TikTok — обязательное условие'
      });
    }

    const existing = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(user.id);
    if (existing) return res.status(400).json({ error: 'Профиль уже существует' });

    const promo = genPromo(name);
    const nichesStr = Array.isArray(niches) ? niches.slice(0, 3).join(',') : niches;

    const result = db.prepare(`
      INSERT INTO creators (
        user_id, name, telegram, phone, city, country,
        instagram, tiktok, threads,
        instagram_followers, tiktok_followers,
        niches, collab_format, promo_code, referrer_code, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')
    `).run(
      user.id, name, telegram, phone || null, city, country,
      instagram || null, tiktok || null, threads || null,
      Number(instagram_followers) || 0, Number(tiktok_followers) || 0,
      nichesStr, collab_format, promo, referrer_code || null
    );

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('creator', user.id);

    // Link referral
    if (referrer_code) {
      const referrer = db.prepare('SELECT * FROM creators WHERE promo_code = ?').get(referrer_code);
      if (referrer) {
        try {
          db.prepare('INSERT INTO referrals (referrer_id, referred_id) VALUES (?,?)').run(referrer.id, result.lastInsertRowid);
        } catch {}
      }
    }

    bot.adminNewCreator(name, req.tgUser.username).catch(() => {});
    const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(result.lastInsertRowid);
    res.json({ creator });
  } catch (e) {
    console.error('/creators/register:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /creators/me
router.get('/me', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const creator = db.prepare('SELECT * FROM creators WHERE user_id = ?').get(user.id);
    if (!creator) return res.status(404).json({ error: 'Profile not found' });

    const referrals = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved
      FROM referrals WHERE referrer_id = ?
    `).get(creator.id);

    const transactions = db.prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
    ).all(user.id);

    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
    ).all(user.id);

    res.json({ creator, referrals, transactions, notifications });
  } catch (e) {
    console.error('/creators/me:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /creators/me
router.put('/me', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { city, country, niches, collab_format } = req.body;
    db.prepare('UPDATE creators SET city=?,country=?,niches=?,collab_format=? WHERE user_id=?')
      .run(city, country, niches, collab_format, user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /creators/offers — all offers shown, but can only apply to matching platform
router.get('/offers', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const creator = db.prepare('SELECT * FROM creators WHERE user_id = ?').get(user?.id);
    if (!creator || creator.status !== 'approved') {
      return res.status(403).json({ error: 'Not approved' });
    }

    const creatorPlatforms = [];
    if (creator.instagram) creatorPlatforms.push('instagram');
    if (creator.tiktok) creatorPlatforms.push('tiktok');
    if (creator.threads) creatorPlatforms.push('threads');

    const offers = db.prepare(`
      SELECT o.*, b.brand_name
      FROM offers o
      JOIN businesses b ON o.business_id = b.id
      WHERE o.status = 'active'
      ORDER BY o.created_at DESC
    `).all();

    const applied = db.prepare(
      'SELECT offer_id FROM applications WHERE creator_id = ?'
    ).all(creator.id).map(a => a.offer_id);

    const result = offers.map(o => {
      const offerPlatform = (o.platform || '').toLowerCase();
      const canApply = creatorPlatforms.includes(offerPlatform);
      return {
        ...o,
        can_apply: canApply,
        applied: applied.includes(o.id)
      };
    });

    res.json(result);
  } catch (e) {
    console.error('/creators/offers:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /creators/offers/:id/apply
router.post('/offers/:id/apply', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const creator = db.prepare('SELECT * FROM creators WHERE user_id = ?').get(user?.id);
    if (!creator || creator.status !== 'approved') {
      return res.status(403).json({ error: 'Not approved' });
    }

    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer || offer.status !== 'active') {
      return res.status(404).json({ error: 'Offer not found or not active' });
    }

    // Check platform match
    const offerPlatform = (offer.platform || '').toLowerCase();
    const creatorPlatforms = [];
    if (creator.instagram) creatorPlatforms.push('instagram');
    if (creator.tiktok) creatorPlatforms.push('tiktok');
    if (creator.threads) creatorPlatforms.push('threads');

    if (!creatorPlatforms.includes(offerPlatform)) {
      return res.status(400).json({ error: 'Ваша платформа не совпадает с платформой оффера' });
    }

    try {
      db.prepare('INSERT INTO applications (offer_id, creator_id, message) VALUES (?,?,?)')
        .run(offer.id, creator.id, req.body.message || '');
    } catch {
      return res.status(400).json({ error: 'Вы уже откликнулись на этот оффер' });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /creators/projects
router.get('/projects', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const creator = db.prepare('SELECT * FROM creators WHERE user_id = ?').get(user?.id);
    if (!creator) return res.status(404).json({ error: 'Not found' });

    const projects = db.prepare(`
      SELECT p.*, o.title, o.description, o.platform, o.product,
             o.what_to_show, o.video_length, o.style, o.deadline,
             b.brand_name
      FROM projects p
      JOIN offers o ON p.offer_id = o.id
      JOIN businesses b ON p.business_id = b.id
      WHERE p.creator_id = ?
      ORDER BY p.created_at DESC
    `).all(creator.id);

    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /creators/projects/:id/upload
router.post('/projects/:id/upload', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const creator = db.prepare('SELECT * FROM creators WHERE user_id = ?').get(user?.id);
    if (!creator) return res.status(403).json({ error: 'Forbidden' });

    const project = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND creator_id = ?'
    ).get(req.params.id, creator.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!['in_progress', 'revision'].includes(project.status)) {
      return res.status(400).json({ error: 'Нельзя загрузить на этом этапе' });
    }

    const { content_url } = req.body;
    if (!content_url) return res.status(400).json({ error: 'Укажите ссылку на контент' });

    db.prepare(`
      UPDATE projects SET content_url=?, status='review', updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(content_url, project.id);

    // Notify business
    const bizRow = db.prepare(`
      SELECT u.telegram_id, c.name as creator_name, o.title
      FROM projects p
      JOIN businesses b ON p.business_id = b.id
      JOIN users u ON b.user_id = u.id
      JOIN offers o ON p.offer_id = o.id
      JOIN creators c ON p.creator_id = c.id
      WHERE p.id = ?
    `).get(project.id);

    if (bizRow) {
      bot.contentUploaded(bizRow.telegram_id, bizRow.creator_name, bizRow.title).catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /creators/points - add points for activity
router.post('/points', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const creator = db.prepare('SELECT * FROM creators WHERE user_id = ?').get(user?.id);
    if (!creator || creator.status !== 'approved') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { action } = req.body; // 'like' = 20, 'comment' = 30
    if (!['like', 'comment'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const pts = action === 'comment' ? 30 : 20;
    db.prepare('UPDATE creators SET points = points + ? WHERE id = ?').run(pts, creator.id);
    db.prepare('INSERT INTO points_log (creator_id, action, points) VALUES (?,?,?)')
      .run(creator.id, action, pts);

    const updated = db.prepare('SELECT points FROM creators WHERE id = ?').get(creator.id);
    res.json({ points: updated.points, added: pts });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
