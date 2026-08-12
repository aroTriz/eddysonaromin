-- ────────────────────────────────────────────────────────────────
-- Production D1 migration (non-destructive — no DROPs).
-- Adds: visit analytics table (one row per page view).
-- Unique visitors = COUNT(DISTINCT ip) over visits.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  site         TEXT    NOT NULL DEFAULT 'portfolio',
  ip           TEXT,                       -- admin-only; masked in the UI
  country      TEXT,                       -- ISO 3166-1 alpha-2
  country_name TEXT,
  region       TEXT,
  city         TEXT,
  lat          REAL,
  lon          REAL,
  path         TEXT,
  referrer     TEXT,
  device       TEXT,
  browser      TEXT,
  os           TEXT,
  created_at   TEXT,
  updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_visits_site_created ON visits(site, created_at);
CREATE INDEX IF NOT EXISTS idx_visits_ip ON visits(ip);
CREATE INDEX IF NOT EXISTS idx_visits_country ON visits(site, country);
