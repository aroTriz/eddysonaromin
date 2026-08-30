-- ────────────────────────────────────────────────────────────────
-- Fix D1 schema: ensure critical tables exist for auth flow.
-- All statements are idempotent (safe to re-run).
-- ────────────────────────────────────────────────────────────────

-- admin_sessions (needed for verify.ts to create session tokens)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- otp_codes (needed for login.ts to store OTPs)
CREATE TABLE IF NOT EXISTS otp_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL,
  code       TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- pet_settings default (the backend reads this on boot)
INSERT OR IGNORE INTO site_settings (key, value)
VALUES ('pet_settings', '{"enabled":false,"globalEnabled":true,"scale":0.5,"speed":1,"animate":true}');

-- ────────────────────────────────────────────────────────────────
-- Experiences & Education CMS (migrated from static profile.ts)
-- Idempotent — safe to re-run on every deploy.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiences (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT    NOT NULL DEFAULT 'experience',
  period       TEXT    NOT NULL,
  year         TEXT    NOT NULL,
  tag          TEXT    NOT NULL,
  title        TEXT    NOT NULL,
  company      TEXT    NOT NULL,
  logo_url     TEXT,
  website_url  TEXT,
  tooltip_desc TEXT,
  albums       TEXT    NOT NULL DEFAULT '[]',
  certificates TEXT    NOT NULL DEFAULT '[]',
  description  TEXT    NOT NULL DEFAULT '',
  highlights   TEXT    NOT NULL DEFAULT '[]',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  archived_at  TEXT,
  created_at   TEXT,
  updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_experiences_type ON experiences(type, sort_order);
CREATE INDEX IF NOT EXISTS idx_experiences_archived ON experiences(archived_at);
