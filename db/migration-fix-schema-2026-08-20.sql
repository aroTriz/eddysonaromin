-- ────────────────────────────────────────────────────────────────
-- Fix D1 schema: add missing columns that newer Pages Functions expect.
-- Uses D1 batch API with continue_on_error so "duplicate column" errors
-- are silently skipped.
-- ────────────────────────────────────────────────────────────────

-- admins.updated_at (may not exist on older D1 databases)
ALTER TABLE admins ADD COLUMN updated_at TEXT;

-- admin_sessions table may not exist at all if schema was incomplete
CREATE TABLE IF NOT EXISTS admin_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

-- otp_codes table may not exist
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
CREATE INDEX IF NOT EXISTS idx_otp_codes_admin ON otp_codes(admin_id, used);

-- Ensure pet_settings entry exists in site_settings
INSERT OR IGNORE INTO site_settings (key, value)
VALUES ('pet_settings', '{"enabled":false,"globalEnabled":true,"scale":0.5,"speed":1,"animate":true}');