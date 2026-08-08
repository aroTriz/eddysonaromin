-- ────────────────────────────────────────────────────────────────
-- Eddyson Aromin portfolio — Cloudflare D1 schema
-- Mirrors the Laravel migrations (backend/database/migrations).
-- ────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  category     TEXT    NOT NULL,                 -- personal | academic
  type         TEXT    NOT NULL,                 -- documentation | ai-tools | game | web-app | ml-data | ar-mobile | networking
  summary      TEXT    NOT NULL,
  tagline      TEXT,
  description  TEXT,
  role         TEXT,
  year         TEXT,
  featured     INTEGER NOT NULL DEFAULT 0,
  technologies TEXT    NOT NULL DEFAULT '[]',    -- JSON array
  url          TEXT,
  source_url   TEXT,
  image_url    TEXT,
  favicon_url  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT,
  updated_at   TEXT
);
CREATE INDEX idx_projects_cat_type ON projects(category, type);
CREATE INDEX idx_projects_featured ON projects(featured);

DROP TABLE IF EXISTS blog_posts;
CREATE TABLE blog_posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  excerpt      TEXT    NOT NULL,
  content      TEXT    NOT NULL,                 -- Markdown
  images       TEXT,                             -- JSON array of image data-URLs
  tags         TEXT,                             -- JSON array or NULL
  published_at TEXT,
  created_at   TEXT,
  updated_at   TEXT
);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at);

DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT,
  message    TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_contact_messages_email ON contact_messages(email);

-- ────────────────────────────────────────────────────────────────
-- Admin auth (/aromin area) + visitor tracking
-- Mirrors the Laravel migration + the previous projects' Pages Functions.
-- ────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS admins;
CREATE TABLE admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,              -- SHA-256 hex
  email         TEXT    NOT NULL,
  created_at    TEXT,
  updated_at    TEXT
);

DROP TABLE IF EXISTS otp_codes;
CREATE TABLE otp_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL,
  code       TEXT    NOT NULL,                 -- 6 digits
  expires_at TEXT    NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
CREATE INDEX idx_otp_codes_admin ON otp_codes(admin_id, used);

DROP TABLE IF EXISTS admin_sessions;
CREATE TABLE admin_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);

DROP TABLE IF EXISTS visitors;
CREATE TABLE visitors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  site       TEXT    NOT NULL DEFAULT 'portfolio',
  count      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE UNIQUE INDEX idx_visitors_site ON visitors(site);

-- ────────────────────────────────────────────────────────────────
-- Tech stack CMS (mirrors the Laravel stack_groups migration).
-- ────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS stack_groups;
CREATE TABLE stack_groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT    NOT NULL UNIQUE,
  items      TEXT    NOT NULL DEFAULT '[]',     -- JSON array of tech names
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
