-- ────────────────────────────────────────────────────────────
-- Production D1 migration (non-destructive — no DROPs).
-- Adds: site_settings key-value table with the community chat
-- on/off switch (default ON).
-- Mirrors the Laravel 2026_08_14_000003_create_site_settings_table
-- migration + db/schema.sql. Safe to run on the existing D1 DB.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

-- Default: community chat ON. '0' = off (visitors see the notice).
INSERT OR IGNORE INTO site_settings (key, value, created_at, updated_at)
VALUES ('community_chat_enabled', '1', datetime('now'), datetime('now'));
