-- ────────────────────────────────────────────────────────────
-- Production D1 migration (non-destructive — no DROPs).
-- Adds: community chat, recommendations, and moderation columns.
-- ────────────────────────────────────────────────────────────

-- Community chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  client_id   TEXT,
  location    TEXT,
  device      TEXT,
  ip          TEXT,
  archived_at TEXT,
  delete_at   TEXT,
  created_at  TEXT,
  updated_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_client ON chat_messages(client_id);

CREATE TABLE IF NOT EXISTS chat_identities (
  client_id  TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

-- Recommendations CMS
CREATE TABLE IF NOT EXISTS recommendations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  initials    TEXT    NOT NULL,
  quote       TEXT    NOT NULL,
  author      TEXT    NOT NULL,
  role        TEXT    NOT NULL,
  email       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at  TEXT,
  updated_at  TEXT
);

-- Missing columns on existing tables
ALTER TABLE blog_posts ADD COLUMN images TEXT;
ALTER TABLE blog_posts ADD COLUMN archived_at TEXT;
ALTER TABLE stack_groups ADD COLUMN archived_at TEXT;
