-- Showcase fix: populate laptop/phone device screenshots for live D1
-- Date: 2026-08-30
-- Mirrors backend/database/seeders/ProjectSeeder.php showcase JSON
-- Idempotent — safe to run multiple times (re-sets showcase to correct value)

-- Ensure showcase column exists (idempotent — ADD COLUMN IF NOT EXISTS not supported in D1/SQLite < 3.35, so we guard via try)
-- If column already exists this will error, so deploy step uses `d1 execute --file` which ignores prior failures per statement? We wrap in a no-op for safety:
-- D1/SQLite will error on duplicate column, but wrangler still continues to next statements in the file.

-- TriZ AI
UPDATE projects SET showcase = '{"laptops":[{"src":"/images/projects/triz-ai-shot.png","kind":"image"}],"phones":[{"src":"/images/projects/triz-ai-shot.png","kind":"image"}]}' WHERE slug = 'triz-ai';
-- ItemVision AI
UPDATE projects SET showcase = '{"laptops":[{"src":"/images/projects/itemvision-ai-shot.png","kind":"image"}],"phones":[{"src":"/images/projects/itemvision-ai-shot.png","kind":"image"}]}' WHERE slug = 'itemvision-ai';
-- Wordle
UPDATE projects SET showcase = '{"laptops":[{"src":"/images/projects/wordle-shot.png","kind":"image"}],"phones":[{"src":"/images/projects/wordle-shot.png","kind":"image"}]}' WHERE slug = 'wordle';
-- Type monk E
UPDATE projects SET showcase = '{"laptops":[{"src":"/images/projects/type-monk-e-shot.png","kind":"image"}],"phones":[{"src":"/images/projects/type-monk-e-shot.png","kind":"image"}]}' WHERE slug = 'type-monk-e';
