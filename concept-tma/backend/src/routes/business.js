const router = require('express').Router();
const db = require('../db/schema');
const auth = require('../middleware/auth');
const bot = require('../bot');

function getUser(tgId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(tgId));
}

// POST /business/register
router.post('/register', auth, (req, res) => {
  try {
    const tgId = String(req.tgUser.id);
    const user = getUser(tgId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { brand_name, contact, website, category, target_audience, geo, content_format, extra } = req.body;

    if (!brand_name || !contact || !website || !category || !target_audience || !geo || !content_format) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    const existing = db.prepare('SELECT id FROM businesses WHERE user_id = ?').get(user.id);
    if (existing) return res.status(400).json({ error: 'Профиль уже существует' });

    const result = db.prepare(`
      INSERT INTO businesses (user_id, brand_name, contact, website, category, target_audience, geo, content_format, extra)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(user.id, brand_name, contact, website, category, target_audience, geo, content_format, extra || null);

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('business', user.id);

    bot.adminNewBusiness(brand_name, contact).catch(() => {});
    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(result.lastInsertRowid);
    res.json({ business: biz });
  } catch (e) {
    console.error('/business/register:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /business/me
router.get('/me', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const biz = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(user.id);
    if (!biz) return res.status(404).json({ error: 'Profile not found' });
    const transactions = db.prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
    ).all(user.id);
    res.json({ business: biz, transactions });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /business/offers — create offer (business fills basic fields, admin enriches)
router.post('/offers', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const biz = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(user?.id);
    if (!biz || biz.status !== 'approved') return res.status(403).json({ error: 'Not approved' });

    const {
      title, description, product, what_to_show, video_length,
      style, platform, niches, budget, deadline
    } = req.body;

    if (!title || !description || !platform) {
      return res.status(400).json({ error: 'Укажите название, описание и платформу' });
    }

    const result = db.prepare(`
      INSERT INTO offers (
        business_id, title, description, product, what_to_show,
        video_length, style, platform, niches, budget, deadline, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,'draft')
    `).run(
      biz.id, title, description, product || null, what_to_show || null,
      video_length || null, style || null,
      platform.toLowerCase(), niches || null,
      Number(budget) || 0, deadline || null
    );

    // Notify admin
    const adminId = process.env.ADMIN_TG_ID;
    if (adminId) {
      bot.bot.sendMessage(adminId,
        `📋 <b>Новый оффер от бизнеса</b>\n\n` +
        `Бренд: ${biz.brand_name}\nНазвание: ${title}\nПлатформа: ${platform}\n\n` +
        `Дополните и активируйте оффер в панели администратора.`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(result.lastInsertRowid);
    res.json({ offer });
  } catch (e) {
    console.error('/business/offers:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /business/offers
router.get('/offers', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const biz = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(user?.id);
    if (!biz) return res.status(404).json({ error: 'Not found' });
    const offers = db.prepare(
      'SELECT * FROM offers WHERE business_id = ? ORDER BY created_at DESC'
    ).all(biz.id);
    res.json(offers);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /business/projects
router.get('/projects', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const biz = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(user?.id);
    if (!biz) return res.status(404).json({ error: 'Not found' });

    const projects = db.prepare(`
      SELECT p.*, o.title, o.platform, o.deadline,
             c.name as creator_name, c.instagram, c.tiktok, c.threads
      FROM projects p
      JOIN offers o ON p.offer_id = o.id
      JOIN creators c ON p.creator_id = c.id
      WHERE p.business_id = ?
      ORDER BY p.created_at DESC
    `).all(biz.id);

    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /business/projects/:id/review — approve or request revision
router.post('/projects/:id/review', auth, (req, res) => {
  try {
    const user = getUser(req.tgUser.id);
    const biz = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(user?.id);
    if (!biz) return res.status(403).json({ error: 'Forbidden' });

    const project = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND business_id = ?'
    ).get(req.params.id, biz.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (project.status !== 'review') {
      return res.status(400).json({ error: 'Проект не на проверке' });
    }

    const { action, feedback } = req.body; // 'approve' or 'revision'
    if (!['approve', 'revision'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Max 3 revisions
    if (action === 'revision' && project.revision_count >= 3) {
      return res.status(400).json({ error: 'Достигнут лимит правок (3)' });
    }

    const newStatus = action === 'approve' ? 'done' : 'revision';
    const newRevCount = action === 'revision' ? project.revision_count + 1 : project.revision_count;

    db.prepare(`
      UPDATE projects SET status=?, feedback=?, revision_count=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(newStatus, feedback || null, newRevCount, project.id);

    // Notify creator
    const crRow = db.prepare(`
      SELECT u.telegram_id, o.title
      FROM projects p JOIN creators c ON p.creator_id=c.id
      JOIN users u ON c.user_id=u.id JOIN offers o ON p.offer_id=o.id
      WHERE p.id=?
    `).get(project.id);

    if (crRow) {
      bot.projectStatusChanged(crRow.telegram_id, newStatus, crRow.title).catch(() => {});
    }

    res.json({ ok: true, status: newStatus, revision_count: newRevCount });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
