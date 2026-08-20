-- ────────────────────────────────────────────────────────────────
-- Ensure admin account exists in D1 (INSERT OR IGNORE).
-- Run on every deploy so the admin can always log in.
-- Password: 0xydmuhv!  (SHA-256 = f58eba5a...d5326d9)
-- ────────────────────────────────────────────────────────────────

-- Ensure the admin row exists (INSERT OR IGNORE won't touch existing rows).
INSERT OR IGNORE INTO admins (username, password_hash, email, user_id, created_at, updated_at)
VALUES ('Aromin15', 'f58eba5aacfba1a273a76af5c48341ccac18ae04155fc3be778371fefc5326d9', 'aromintristan@gmail.com', 1, '2026-08-09 00:00:00', '2026-08-09 00:00:00');

-- Ensure the linked user row exists.
INSERT OR IGNORE INTO users (id, name, email, password, created_at, updated_at)
VALUES (1, 'Eddyson Aromin', 'aromintristan@gmail.com', 'c4e9a64fa71ec27e15dfaf63d2bf512c9799115c0e4b0dd5a2ab6ab7f5fae8b7', '2026-08-09 00:00:00', '2026-08-09 00:00:00');

-- Ensure visitor counter row exists.
INSERT OR IGNORE INTO visitors (site, count, created_at, updated_at)
VALUES ('portfolio', 0, '2026-08-09 00:00:00', '2026-08-09 00:00:00');

-- Ensure site_settings defaults exist.
INSERT OR IGNORE INTO site_settings (key, value, created_at, updated_at)
VALUES ('community_chat_enabled', '1', NULL, NULL);

INSERT OR IGNORE INTO site_settings (key, value, created_at, updated_at)
VALUES ('backdrop_enabled', '1', NULL, NULL);

INSERT OR IGNORE INTO site_settings (key, value, created_at, updated_at)
VALUES ('click_me_enabled', '1', NULL, NULL);

INSERT OR IGNORE INTO site_settings (key, value, created_at, updated_at)
VALUES ('ask_triz_enabled', '1', NULL, NULL);
