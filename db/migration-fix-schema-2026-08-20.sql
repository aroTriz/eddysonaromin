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
