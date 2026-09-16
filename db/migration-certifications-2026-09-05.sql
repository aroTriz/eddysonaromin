-- Certifications CMS — transferred from static profile.ts to DB
CREATE TABLE IF NOT EXISTS certifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT    NOT NULL UNIQUE,
  title      TEXT    NOT NULL,
  issuer     TEXT    NOT NULL,
  year       TEXT    NOT NULL,
  category   TEXT    NOT NULL DEFAULT 'certification',
  summary    TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_certifications_category ON certifications(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_certifications_archived ON certifications(archived_at);
INSERT OR IGNORE INTO certifications (id, slug, title, issuer, year, category, summary, sort_order, created_at, updated_at) VALUES
  (1, 'bachelor-of-science-in-information-technology', 'Bachelor of Science in Information Technology', 'Saint Louis University (SAMCIS)', '2025', 'degree', 'Four-year undergraduate degree in Information Technology at Saint Louis University — covering software development, web technologies, databases, networking, and information systems, capped by a full-stack capstone project (ISakay).', 0, datetime('now'), datetime('now')),
  (2, 'agile-fast-phased-development', 'Agile & Fast-Phased Development', 'PRAXXYS Solutions Inc.', '2026', 'certification', 'Company credential from PRAXXYS Solutions Inc. on agile methodology and fast-phased delivery — the working practices used on real client web and mobile work in an agile development team.', 1, datetime('now'), datetime('now')),
  (3, 'quality-assurance-testing', 'Quality Assurance & Testing', 'NOAH Business Application', '2025', 'certification', 'QA credential from NOAH Business Application covering the full quality assurance discipline — test case authoring, bug and regression tracking, and documentation review for release readiness.', 2, datetime('now'), datetime('now'));
