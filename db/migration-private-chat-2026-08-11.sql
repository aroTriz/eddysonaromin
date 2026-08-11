-- ────────────────────────────────────────────────────────────
-- Production D1 migration (non-destructive — no DROPs).
-- Adds: private chat (users + tokens + sessions + messages) +
-- links the admin to a private-chat account.
-- Mirrors the Laravel 2026_08_11_000001_create_private_chat_tables
-- migration + db/schema.sql. Safe to run on the existing D1 DB.
-- ────────────────────────────────────────────────────────────

-- Private-chat users (SHA-256 password hash, admins pattern)
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL UNIQUE,
  password   TEXT    NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

-- The admin's chat account — visitors DM this user. The password is a
-- throwaway hash (admin replies from the /aromin area only).
INSERT OR IGNORE INTO users (id, name, email, password, created_at, updated_at)
VALUES (1, 'Eddyson Aromin', 'aromintristan@gmail.com', 'c4e9a64fa71ec27e15dfaf63d2bf512c9799115c0e4b0dd5a2ab6ab7f5fae8b7', '2026-08-11 00:00:00', '2026-08-11 00:00:00');

-- Link the admin row to that account (guards against a missing column).
ALTER TABLE admins ADD COLUMN user_id INTEGER;
UPDATE admins SET user_id = 1 WHERE username = 'Aromin';

CREATE TABLE IF NOT EXISTS private_chat_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pc_tokens_token ON private_chat_tokens(token);

CREATE TABLE IF NOT EXISTS private_chat_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a_id  INTEGER NOT NULL,
  user_b_id  INTEGER NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS private_chat_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  sender_id  INTEGER NOT NULL,
  message    TEXT    NOT NULL,
  read_at    TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (session_id) REFERENCES private_chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pc_messages_session ON private_chat_messages(session_id, id);
