-- ────────────────────────────────────────────────────────────
-- Production D1 migration (non-destructive).
-- Adds: users.banned_at — the account blacklist column.
-- Mirrors the Laravel 2026_08_14_000004_add_banned_at_to_users_table
-- migration + db/schema.sql. Safe to run on the existing D1 DB.
-- ────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN banned_at TEXT;
