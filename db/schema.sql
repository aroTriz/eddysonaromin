-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Eddyson Aromin portfolio â€” Cloudflare D1 schema
-- Mirrors the Laravel migrations (backend/database/migrations).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  category     TEXT    NOT NULL,                 -- personal | academic
  type         TEXT    NOT NULL,                 -- documentation | ai-tools | game | web-app | ml-data | ar-mobile | networking
  summary      TEXT    NOT NULL,
  tagline      TEXT,
  description  TEXT,
  role         TEXT,
  year         TEXT,
  featured     INTEGER NOT NULL DEFAULT 0,
  technologies TEXT    NOT NULL DEFAULT '[]',    -- JSON array
  url          TEXT,
  source_url   TEXT,
  image_url    TEXT,
  favicon_url  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT,
  updated_at   TEXT
);
CREATE INDEX idx_projects_cat_type ON projects(category, type);
CREATE INDEX idx_projects_featured ON projects(featured);

DROP TABLE IF EXISTS blog_posts;
CREATE TABLE blog_posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  excerpt      TEXT    NOT NULL,
  content      TEXT    NOT NULL,                 -- Markdown
  images       TEXT,                             -- JSON array of image data-URLs
  tags         TEXT,                             -- JSON array or NULL
  published_at TEXT,
  created_at   TEXT,
  updated_at   TEXT
);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at);

DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT,
  message    TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_contact_messages_email ON contact_messages(email);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Admin auth (/aromin area) + visitor tracking
-- Mirrors the Laravel migration + the previous projects' Pages Functions.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP TABLE IF EXISTS admins;
CREATE TABLE admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,              -- SHA-256 hex
  email         TEXT    NOT NULL,
  user_id       INTEGER,                       -- linked users row (private chat)
  created_at    TEXT,
  updated_at    TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS otp_codes;
CREATE TABLE otp_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL,
  code       TEXT    NOT NULL,                 -- 6 digits
  expires_at TEXT    NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
CREATE INDEX idx_otp_codes_admin ON otp_codes(admin_id, used);

DROP TABLE IF EXISTS admin_sessions;
CREATE TABLE admin_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);

DROP TABLE IF EXISTS visitors;
CREATE TABLE visitors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  site       TEXT    NOT NULL DEFAULT 'portfolio',
  count      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE UNIQUE INDEX idx_visitors_site ON visitors(site);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Visit analytics (one row per page view)
-- Unique visitors = COUNT(DISTINCT ip) over this table â€” never the
-- visitors.count above (which is a denormalized cache of that value).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP TABLE IF EXISTS visits;
CREATE TABLE visits (
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
CREATE INDEX idx_visits_site_created ON visits(site, created_at);
CREATE INDEX idx_visits_ip ON visits(ip);
CREATE INDEX idx_visits_country ON visits(site, country);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Tech stack CMS (mirrors the Laravel stack_groups migration).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP TABLE IF EXISTS stack_groups;
CREATE TABLE stack_groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT    NOT NULL UNIQUE,
  items      TEXT    NOT NULL DEFAULT '[]',     -- JSON array of tech names
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Community chat (mirrors the Laravel chat tables migration).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP TABLE IF EXISTS chat_messages;
CREATE TABLE chat_messages (
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
CREATE INDEX idx_chat_messages_client ON chat_messages(client_id);

DROP TABLE IF EXISTS chat_identities;
CREATE TABLE chat_identities (
  client_id  TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Private chat (1-on-1 DMs) â€” mirrors the Laravel private chat migration.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL UNIQUE,
  password   TEXT    NOT NULL,                -- SHA-256 hex (admins pattern)
  banned_at  TEXT,                            -- account blacklist (null = active)
  created_at TEXT,
  updated_at TEXT
);

DROP TABLE IF EXISTS private_chat_tokens;
CREATE TABLE private_chat_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  token      TEXT    NOT NULL UNIQUE,          -- 64-char hex bearer
  expires_at TEXT    NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_pc_tokens_token ON private_chat_tokens(token);

DROP TABLE IF EXISTS private_chat_sessions;
CREATE TABLE private_chat_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a_id  INTEGER NOT NULL,
  user_b_id  INTEGER NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_a_id, user_b_id)               -- normalized: user_a_id < user_b_id
);

DROP TABLE IF EXISTS private_chat_messages;
CREATE TABLE private_chat_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  sender_id  INTEGER NOT NULL,
  message    TEXT    NOT NULL,
  attachment TEXT,                          -- JSON { kind, name, size, mime, data }
  read_at    TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (session_id) REFERENCES private_chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_pc_messages_session ON private_chat_messages(session_id, id);

-- "Is typing" heartbeats (one row per participant per conversation).
DROP TABLE IF EXISTS private_chat_typing;
CREATE TABLE private_chat_typing (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  user_id         INTEGER NOT NULL,
  typing_until    TEXT,
  created_at      TEXT,
  updated_at      TEXT,
  UNIQUE (conversation_id, user_id)
);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Site settings (key-value) â€” mirrors the Laravel site_settings migration.
-- `community_chat_enabled` = '1' (default) | '0' â€” toggled from the
-- /aromin preferences page; the community chat rejects new messages
-- and shows a "turned off" notice to visitors when '0'.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP TABLE IF EXISTS site_settings;
CREATE TABLE site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

INSERT OR IGNORE INTO site_settings (key, value, created_at, updated_at)
VALUES ('community_chat_enabled', '1', NULL, NULL);

INSERT OR IGNORE INTO site_settings (key, value, created_at, updated_at)
VALUES ('backdrop_enabled', '1', NULL, NULL);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Experiences & Education CMS â€” replaces the static profile.ts data.
-- Both types share the same table; `type` = 'experience' | 'education'.
-- Images (logo, albums, certificates) are uploaded as base64 data-URLs
-- and stored directly in JSON columns â€” no external file host needed.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP TABLE IF EXISTS experiences;
CREATE TABLE experiences (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT    NOT NULL DEFAULT 'experience',  -- experience | education
  period       TEXT    NOT NULL,                        -- e.g. "Nov 2025 â€” Jun 2026"
  year         TEXT    NOT NULL,                        -- short year label e.g. "2025 â€” 2026"
  tag          TEXT    NOT NULL,                        -- Professional | Internship | Graduated
  title        TEXT    NOT NULL,                        -- job title or degree
  company      TEXT    NOT NULL,                        -- company or school name
  logo_url     TEXT,                                   -- uploaded logo data-URL
  website_url  TEXT,                                   -- company/school website
  tooltip_desc TEXT,                                   -- short description for hover tooltip
  albums       TEXT    NOT NULL DEFAULT '[]',           -- JSON array of image data-URLs (gallery)
  certificates TEXT    NOT NULL DEFAULT '[]',           -- JSON array of image data-URLs (certs)
  description  TEXT    NOT NULL DEFAULT '',             -- full description
  highlights   TEXT    NOT NULL DEFAULT '[]',           -- JSON array of bullet strings
  sort_order   INTEGER NOT NULL DEFAULT 0,
  archived_at  TEXT,
  created_at   TEXT,
  updated_at   TEXT
);
CREATE INDEX idx_experiences_type ON experiences(type, sort_order);
CREATE INDEX idx_experiences_archived ON experiences(archived_at);

DROP TABLE IF EXISTS certifications;
CREATE TABLE certifications (
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
CREATE INDEX idx_certifications_category ON certifications(category, sort_order);
CREATE INDEX idx_certifications_archived ON certifications(archived_at);

-- Seed static certifications from profile.ts (now managed via CMS)
INSERT OR IGNORE INTO certifications (id, slug, title, issuer, year, category, summary, sort_order, created_at, updated_at) VALUES
  (1, 'bachelor-of-science-in-information-technology', 'Bachelor of Science in Information Technology', 'Saint Louis University (SAMCIS)', '2025', 'degree', 'Four-year undergraduate degree in Information Technology at Saint Louis University — covering software development, web technologies, databases, networking, and information systems, capped by a full-stack capstone project (ISakay).', 0, datetime('now'), datetime('now')),
  (2, 'agile-fast-phased-development', 'Agile & Fast-Phased Development', 'PRAXXYS Solutions Inc.', '2026', 'certification', 'Company credential from PRAXXYS Solutions Inc. on agile methodology and fast-phased delivery — the working practices used on real client web and mobile work in an agile development team.', 1, datetime('now'), datetime('now')),
  (3, 'quality-assurance-testing', 'Quality Assurance & Testing', 'NOAH Business Application', '2025', 'certification', 'QA credential from NOAH Business Application covering the full quality assurance discipline — test case authoring, bug and regression tracking, and documentation review for release readiness.', 2, datetime('now'), datetime('now'));


DROP TABLE IF EXISTS recommendations;
CREATE TABLE recommendations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  initials   TEXT    NOT NULL,
  quote      TEXT    NOT NULL,
  author     TEXT    NOT NULL,
  role       TEXT    NOT NULL,
  email      TEXT,
  phone      TEXT,
  photo_url  TEXT,
  letter_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_recommendations_sort ON recommendations(sort_order);

