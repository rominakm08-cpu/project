const router = require('express').Router();
const db = require('../db/schema');
const auth = require('../middleware/auth');
const bot = require('../bot');

function getUser(tgId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(tgId));
}

function adminOnly(req, res, next) {
  const user = getUser(req.tgUser.id);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  req.adminUser = user;
  next();
}

// Set admin (one-time setup)
router.post('/set-admin', (req, res) => {
  try {
    const { secret, telegram_id } = req.body;
    if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Wrong secret' });
    const result = db.prepare("UPDATE users SET role='admin' WHERE telegram_id=?").run(String(telegram_id));
    if (result.changes === 0) {
      // User doesn't exist yet, create them
      db.prepare("INSERT OR IGNORE INTO users (telegram_id, role) VALUES (?,?)").run(String(telegram_id), 'admin');
    }
    process.env.ADMIN_TG_ID = String(telegram_id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET stats
router.get('/stats', auth, adminOnly, (req, res) => {
  try {
    res.json({
      creators: db.prepare("SELECT COUNT(*) as n FROM creators WHERE status='approved'").get().n,
      pending_creators: db.prepare("SELECT COUNT(*) as n FROM creators WHERE status='pending'").get().n,
      rejected_creators: db.prepare("SELECT COUNT(*) as n FROM creators WHERE status='rejected'").get().n,
      businesses: db.prepare("SELECT COUNT(*) as n FROM businesses WHERE status='approved'").get().n,
      pending_businesses: db.prepare("SELECT COUNT(*) as n FROM businesses WHERE status='pending'").get().n,
      active_projects: db.prepare("SELECT COUNT(*) as n FROM projects WHERE status NOT IN ('paid','closed')").get().n,
      total_commission: db.prepare("SELECT COALESCE(SUM(ABS(amount)),0) as n FROM transactions WHERE type='commission'").get().n,
      total_offers: db.prepare("SELECT COUNT(*) as n FROM offers").get().n,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/creators?status=pending
router.get('/creators', auth, adminOnly, (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const creators = db.prepare(`
      SELECT c.*, u.telegram_id
      FROM creators c JOIN users u ON c.user_id = u.id
      WHERE c.status = ? ORDER BY c.created_at DESC
    `).all(status);
    res.json(creators);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/creators/:id/approve
router.post('/creators/:id/approve', auth, adminOnly, (req, res) => {
  try {
    const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(req.params.id);
    if (!creator) return res.status(404).json({ error: 'Not found' });

    db.prepare("UPDATE creators SET status='approved' WHERE id=?").run(creator.id);

    // Handle referral
    if (creator.referrer_code) {
      const referrer = db.prepare('SELECT * FROM creators WHERE promo_code=?').get(creator.referrer_code);
      if (referrer) {
        db.prepare("UPDATE referrals SET status='approved' WHERE referred_id=?").run(creator.id);
        const approved = db.prepare(
          "SELECT COUNT(*) as n FROM referrals WHERE referrer_id=? AND status='approved'"
        ).get(referrer.id);
        if (approved.n > 0 && approved.n % 5 === 0) {
          const refUser = db.prepare('SELECT * FROM users WHERE id=?').get(referrer.user_id);
          if (refUser) {
            bot.referralBonus(refUser.telegram_id, approved.n).catch(() => {});
          }
          bot.adminReferralReady(referrer.name, referrer.promo_code).catch(() => {});
        }
      }
    }

    const user = db.prepare('SELECT * FROM users WHERE id=?').get(creator.user_id);
    if (user) bot.creatorApproved(user.telegram_id, creator.promo_code).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/creators/:id/reject
router.post('/creators/:id/reject', auth, adminOnly, (req, res) => {
  try {
    const { reason } = req.body;
    const creator = db.prepare('SELECT * FROM creators WHERE id=?').get(req.params.id);
    if (!creator) return res.status(404).json({ error: 'Not found' });
    db.prepare("UPDATE creators SET status='rejected', reject_reason=? WHERE id=?").run(reason || '', creator.id);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(creator.user_id);
    if (user) bot.creatorRejected(user.telegram_id, reason).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/businesses
router.get('/businesses', auth, adminOnly, (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const businesses = db.prepare(`
      SELECT b.*, u.telegram_id
      FROM businesses b JOIN users u ON b.user_id = u.id
      WHERE b.status = ? ORDER BY b.created_at DESC
    `).all(status);
    res.json(businesses);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/businesses/:id/approve
router.post('/businesses/:id/approve', auth, adminOnly, (req, res) => {
  try {
    const biz = db.prepare('SELECT * FROM businesses WHERE id=?').get(req.params.id);
    if (!biz) return res.status(404).json({ error: 'Not found' });
    db.prepare("UPDATE businesses SET status='approved' WHERE id=?").run(biz.id);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(biz.user_id);
    if (user) {
      bot.bot.sendMessage(user.telegram_id,
        `✅ <b>Заявка бренда одобрена!</b>\n\nДобро пожаловать в CONCEPT ADS 🎉\n\nТеперь вы можете создавать проекты.`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📱 Открыть кабинет', web_app: { url: process.env.APP_URL } }]] } }
      ).catch(() => {});
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/businesses/:id/reject
router.post('/businesses/:id/reject', auth, adminOnly, (req, res) => {
  try {
    db.prepare("UPDATE businesses SET status='rejected' WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/offers
router.get('/offers', auth, adminOnly, (req, res) => {
  try {
    const { status } = req.query;
    let q = 'SELECT o.*, b.brand_name FROM offers o JOIN businesses b ON o.business_id=b.id';
    if (status) q += ' WHERE o.status = ?';
    q += ' ORDER BY o.created_at DESC';
    const offers = status ? db.prepare(q).all(status) : db.prepare(q).all();
    res.json(offers);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /admin/offers/:id — enrich offer and activate
router.put('/offers/:id', auth, adminOnly, (req, res) => {
  try {
    const {
      title, description, product, what_to_show, video_length, style,
      platform, niches, budget, deadline, language, post_topics,
      post_examples, main_idea, start_from, status
    } = req.body;

    db.prepare(`
      UPDATE offers SET
        title=?, description=?, product=?, what_to_show=?, video_length=?,
        style=?, platform=?, niches=?, budget=?, deadline=?, language=?,
        post_topics=?, post_examples=?, main_idea=?, start_from=?, status=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      title, description, product, what_to_show, video_length,
      style, platform?.toLowerCase(), niches, budget, deadline, language,
      post_topics, post_examples, main_idea, start_from, status,
      req.params.id
    );

    // If activating — notify matching creators
    if (status === 'active') {
      const offer = db.prepare('SELECT * FROM offers WHERE id=?').get(req.params.id);
      const platform_lc = (offer.platform || '').toLowerCase();
      const creators = db.prepare(`
        SELECT c.*, u.telegram_id FROM creators c
        JOIN users u ON c.user_id=u.id WHERE c.status='approved'
      `).all();
      creators.forEach(c => {
        const cp = [];
        if (c.instagram) cp.push('instagram');
        if (c.tiktok) cp.push('tiktok');
        if (c.threads) cp.push('threads');
        if (cp.includes(platform_lc)) {
          bot.newOffer(c.telegram_id, offer.title, offer.platform).catch(() => {});
        }
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('/admin/offers/:id PUT:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/offers/:id/applications
router.get('/offers/:id/applications', auth, adminOnly, (req, res) => {
  try {
    const apps = db.prepare(`
      SELECT a.*, c.name, c.instagram, c.tiktok, c.threads,
             c.instagram_followers, c.tiktok_followers, c.niches, c.collab_format
      FROM applications a JOIN creators c ON a.creator_id=c.id
      WHERE a.offer_id=? ORDER BY a.created_at DESC
    `).all(req.params.id);
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/applications/:id/select — create project from application
router.post('/applications/:id/select', auth, adminOnly, (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id=?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });

    const offer = db.prepare('SELECT * FROM offers WHERE id=?').get(app.offer_id);
    db.prepare("UPDATE applications SET status='selected' WHERE id=?").run(app.id);

    const projResult = db.prepare(`
      INSERT INTO projects (offer_id, creator_id, business_id, amount)
      VALUES (?,?,?,?)
    `).run(app.offer_id, app.creator_id, offer.business_id, offer.budget || 0);

    db.prepare("UPDATE offers SET status='in_progress' WHERE id=?").run(offer.id);

    const crUser = db.prepare(`
      SELECT u.telegram_id FROM creators c JOIN users u ON c.user_id=u.id WHERE c.id=?
    `).get(app.creator_id);
    if (crUser) bot.projectStatusChanged(crUser.telegram_id, 'in_progress', offer.title).catch(() => {});

    res.json({ project_id: projResult.lastInsertRowid, ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/projects
router.get('/projects', auth, adminOnly, (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, o.title, o.platform,
             c.name as creator_name, b.brand_name
      FROM projects p
      JOIN offers o ON p.offer_id=o.id
      JOIN creators c ON p.creator_id=c.id
      JOIN businesses b ON p.business_id=b.id
      ORDER BY p.updated_at DESC
    `).all();
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/projects/:id/status
router.post('/projects/:id/status', auth, adminOnly, (req, res) => {
  try {
    const { status } = req.body;
    const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });

    db.prepare("UPDATE projects SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(status, project.id);

    if (status === 'paid') {
      const commission = Math.floor(project.amount * project.commission_pct / 100);
      const payout = project.amount - commission;
      db.prepare('UPDATE creators SET balance = balance + ? WHERE id=?').run(payout, project.creator_id);

      const crRow = db.prepare(`
        SELECT u.* FROM creators c JOIN users u ON c.user_id=u.id WHERE c.id=?
      `).get(project.creator_id);
      if (crRow) {
        db.prepare('INSERT INTO transactions (user_id,type,amount,description) VALUES (?,?,?,?)').run(
          crRow.id, 'withdrawal', payout, `Выплата по проекту #${project.id}`
        );
        db.prepare('INSERT INTO transactions (user_id,type,amount,description) VALUES (?,?,?,?)').run(
          crRow.id, 'commission', -commission, `Комиссия платформы 20%`
        );
      }

      const offerRow = db.prepare('SELECT title FROM offers WHERE id=?').get(project.offer_id);
      if (crRow) bot.projectStatusChanged(crRow.telegram_id, 'paid', offerRow?.title || '').catch(() => {});
    }

    if (status === 'closed') {
      const offerRow = db.prepare('SELECT title FROM offers WHERE id=?').get(project.offer_id);
      const crUser = db.prepare(`SELECT u.telegram_id FROM creators c JOIN users u ON c.user_id=u.id WHERE c.id=?`).get(project.creator_id);
      const bizUser = db.prepare(`SELECT u.telegram_id FROM businesses b JOIN users u ON b.user_id=u.id WHERE b.id=?`).get(project.business_id);
      bot.projectClosed(crUser?.telegram_id, bizUser?.telegram_id, offerRow?.title || '').catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/referrals
router.get('/referrals', auth, adminOnly, (req, res) => {
  try {
    const referrals = db.prepare(`
      SELECT c.name, c.promo_code,
        COUNT(r.id) as total_referred,
        SUM(CASE WHEN r.status='approved' THEN 1 ELSE 0 END) as approved_count
      FROM creators c
      LEFT JOIN referrals r ON r.referrer_id = c.id
      WHERE c.status = 'approved'
      GROUP BY c.id
      ORDER BY approved_count DESC
    `).all();
    res.json(referrals);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
