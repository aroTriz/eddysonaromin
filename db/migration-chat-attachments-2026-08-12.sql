-- ────────────────────────────────────────────────────────────────
-- Production D1 migration (non-destructive — no DROPs).
-- Adds: chat attachments (one JSON column) + "is typing" heartbeats.
-- ────────────────────────────────────────────────────────────────

ALTER TABLE private_chat_messages ADD COLUMN attachment TEXT;

CREATE TABLE IF NOT EXISTS private_chat_typing (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  user_id         INTEGER NOT NULL,
  typing_until    TEXT,
  created_at      TEXT,
  updated_at      TEXT,
  UNIQUE (conversation_id, user_id)
);
