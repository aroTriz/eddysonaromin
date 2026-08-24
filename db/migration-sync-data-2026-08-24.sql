-- Data sync: insert missing projects + update taglines
-- Idempotent — safe to run multiple times (INSERT OR IGNORE)

-- 1. Insert the missing inJoy project (id 16 in local)
INSERT OR IGNORE INTO projects (id, title, slug, category, type, summary, tagline, description, role, year, featured, technologies, url, source_url, image_url, favicon_url, showcase, sort_order, created_at, updated_at, archived_at)
VALUES (
  16,
  'inJoy',
  'injoy',
  'professional',
  'web-app',
  'A food and recipe discovery platform for Filipino entrepreneurs — explore recipes, discover products, browse blogs, and start your negosyo journey.',
  'Negosyo na! A Filipino food & recipe platform — discover recipes, products, and blogs to kickstart your food business.',
  'A full-featured web platform built for Filipino food entrepreneurs and home cooks. inJoy brings together recipe discovery, product browsing, blogs, and business resources in one place. Designed to inspire and empower aspiring negosyante with practical recipes and food business ideas.',
  'Full-Stack Developer',
  '2026',
  1,
  '["Laravel","Vue.js","MySQL","Tailwind CSS"]',
  'https://injoy.com.ph',
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  '2026-08-17 18:20:04',
  '2026-08-17 18:20:04',
  NULL
);

-- 2. Update taglines on all projects (local has them, D1 may not)
UPDATE projects SET tagline = 'Team Tris system docs — a full showcase of the harness: all 19 roles, 94 skills, 21 workflows, and the memory system in one readable site.' WHERE slug = 'triz-ai';
UPDATE projects SET tagline = 'Camera-based object and face tracking right in your browser — point, detect, and follow items, faces, and objects with AI vision.' WHERE slug = 'itemvision-ai';
UPDATE projects SET tagline = 'A faithful NYT-style Wordle clone — guess 5-letter words and get green, yellow, or gray feedback on every single attempt.' WHERE slug = 'wordle';
UPDATE projects SET tagline = 'A minimal typing test with real-time WPM and accuracy tracking — practice, measure, and improve your typing speed daily.' WHERE slug = 'type-monk-e';
UPDATE projects SET tagline = 'A jeepney ticketing web app — passengers pick travel schedules and reserve seats, while drivers manage routes and manifests.' WHERE slug = 'isakay';
UPDATE projects SET tagline = 'ML-driven forecasting that analyzes historical crypto data, market trends, and volumes to predict future price movements.' WHERE slug = 'cryptopredictor';
UPDATE projects SET tagline = 'An offline AR indoor navigation app built with Unity — point your camera and follow AR overlays to navigate any building.' WHERE slug = 'arventure';
UPDATE projects SET tagline = 'A real-time video platform supporting both sequential playback of uploaded videos and live streaming in a responsive UI.' WHERE slug = 'aldrin-stream';
UPDATE projects SET tagline = 'An employee time-in/time-out tracker that makes attendance management accurate — log hours, monitor work, and report easily.' WHERE slug = 'kronos';
UPDATE projects SET tagline = 'A competitive word game where players race to build the longest valid word from a shared set of letters to win the round.' WHERE slug = 'wordy';
UPDATE projects SET tagline = 'A client-server LAN chat application for real-time messaging — connect multiple clients and exchange messages instantly.' WHERE slug = 'chat-system';
