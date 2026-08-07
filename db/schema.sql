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
