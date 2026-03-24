const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'concept.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS creators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER REFERENCES offers(id),
    creator_id INTEGER REFERENCES creators(id),
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(offer_id, creator_id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER REFERENCES offers(id),
    creator_id INTEGER REFERENCES creators(id),
    business_id INTEGER REFERENCES businesses(id),
    status TEXT DEFAULT 'new',
    content_url TEXT,
    feedback TEXT,
    revision_count INTEGER DEFAULT 0,
    amount INTEGER DEFAULT 0,
    commission_pct INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER REFERENCES creators(id),
    referred_id INTEGER UNIQUE REFERENCES creators(id),
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS points_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER REFERENCES creators(id),
    action TEXT NOT NULL,
    points INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
