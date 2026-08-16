-- ────────────────────────────────────────────────────────────
-- Production D1 migration (non-destructive — no DROPs).
-- Adds admin archive support to private chat conversations:
--   private_chat_sessions.archived_at — the admin archives a thread
--   from the /aromin inbox; archived threads hide from the active
--   list and are restorable. Any new message clears the flag.
-- Mirrors the Laravel 2026_08_14_000001_... migration.
-- Safe to run on the existing D1 DB.
-- ────────────────────────────────────────────────────────────

ALTER TABLE private_chat_sessions ADD COLUMN archived_at TEXT;
CREATE INDEX IF NOT EXISTS idx_pc_sessions_archived ON private_chat_sessions(archived_at);
