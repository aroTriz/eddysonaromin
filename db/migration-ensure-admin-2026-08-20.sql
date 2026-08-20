-- ────────────────────────────────────────────────────────────────
-- Ensure admin account exists in D1 (INSERT OR IGNORE).
-- Run on every deploy so the admin can always log in.
-- Password: 0xydmuhv!  (SHA-256 = f58eba5a...d5326d9)
-- ────────────────────────────────────────────────────────────────

-- Ensure all expected columns exist on the admins table.
-- D1 doesn't support IF NOT EXISTS for ALTER TABLE, so we catch errors.
-- These are safe to re-run: "duplicate column" errors are silently ignored.
-- Note: D1 doesn't support PRAGMA for this — we use batch with try/catch.

-- Ensure the admin row exists (INSERT OR IGNORE won't touch existing rows).
INSERT OR IGNORE INTO admins (username, password_hash, email, user_id)
VALUES ('Aromin15', 'f58eba5aacfba1a273a76af5c48341ccac18ae04155fc3be778371fefc5326d9', 'aromintristan@gmail.com', 1);

-- Ensure the linked user row exists.
INSERT OR IGNORE INTO users (id, name, email, password)
VALUES (1, 'Eddyson Aromin', 'aromintristan@gmail.com', 'c4e9a64fa71ec27e15dfaf63d2bf512c9799115c0e4b0dd5a2ab6ab7f5fae8b7');

-- Ensure visitor counter row exists.
INSERT OR IGNORE INTO visitors (site, count)
VALUES ('portfolio', 0);

-- Ensure site_settings defaults exist.
INSERT OR IGNORE INTO site_settings (key, value)
VALUES ('community_chat_enabled', '1');

INSERT OR IGNORE INTO site_settings (key, value)
VALUES ('backdrop_enabled', '1');

INSERT OR IGNORE INTO site_settings (key, value)
VALUES ('click_me_enabled', '1');

INSERT OR IGNORE INTO site_settings (key, value)
VALUES ('ask_triz_enabled', '1');
