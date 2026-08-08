-- ────────────────────────────────────────────────────────────────
-- Eddyson Aromin portfolio — Cloudflare D1 seed data
-- Mirrors backend/database/seeders/ProjectSeeder.php + BlogPostSeeder.php
-- ────────────────────────────────────────────────────────────────

INSERT INTO projects
  (title, slug, category, type, summary, tagline, description, role, year, featured, technologies, url, source_url, image_url, favicon_url, sort_order, created_at, updated_at)
VALUES
  -- ── Personal projects ────────────────────────────────────────
  ('Triz AI', 'triz-ai', 'personal', 'documentation',
   'The Trizai System Architecture info site — a comprehensive showcase of the God of the Tech Field harness including all 19 roles, 94 skills, 21 workflows, memory systems, and engineering discipline.',
   'Team Tris system docs — a full showcase of the harness: all 19 roles, 94 skills, 21 workflows, and the memory system in one readable site.',
   'A documentation and architecture showcase site for the Trizai development system. It presents the complete engineering harness — 19 expert roles, 94 reusable skills, 21 execution workflows, the memory system, and the engineering discipline that binds it together. Built as a single-page documentation hub with a focus on readability and structure.',
   'Solo Developer', '2026', 1, '["HTML","CSS","JavaScript","Tailwind CSS"]',
   'https://trizai-html.pages.dev', 'https://github.com/aroTriz/trizai-html', '/images/projects/triz-ai-shot.png', '/images/projects/icons/triz-ai.svg', 1, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('ItemVision AI', 'itemvision-ai', 'personal', 'ai-tools',
   'A real-time object and face tracking web application that uses your camera to detect and track items, faces, and objects through AI-powered computer vision.',
   'Camera-based object and face tracking right in your browser — point, detect, and follow items, faces, and objects with AI vision.',
   'A browser-based computer vision tool that taps into the device camera to detect and track objects, faces, and items in real time. Demonstrates practical use of the Camera API and AI-powered detection without needing a dedicated app install.',
   'Solo Developer', '2026', 0, '["JavaScript","TensorFlow.js","MediaPipe","COCO-SSD"]',
   'https://item-vision.pages.dev', 'https://github.com/aroTriz/item-vision', '/images/projects/itemvision-ai-shot.png', '/images/projects/icons/itemvision-ai.svg', 2, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Wordle', 'wordle', 'personal', 'game',
   'A Wordle clone game — an exact NYT Wordle design clone where players guess 5-letter words with color feedback on each attempt.',
   'A faithful NYT-style Wordle clone — guess 5-letter words and get green, yellow, or gray feedback on every single attempt.',
   'A faithful recreation of the classic NYT Wordle experience. Players guess 5-letter words with real-time color feedback — green for correct position, yellow for present, gray for absent — backed by a word bank and streak tracking.',
   'Solo Developer', '2026', 0, '["JavaScript","HTML/CSS","Dictionary API"]',
   'https://wordle-game-bxo.pages.dev', 'https://github.com/aroTriz/wordle-game', '/images/projects/wordle-shot.png', '/images/projects/icons/wordle.svg', 3, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Type monk E', 'type-monk-e', 'personal', 'game',
   'A typing test website designed to help users improve their typing speed and accuracy with a clean, minimal interface and real-time WPM tracking.',
   'A minimal typing test with real-time WPM and accuracy tracking — practice, measure, and improve your typing speed daily.',
   'A minimal typing practice tool with real-time words-per-minute and accuracy tracking. Clean interface, randomized passages, and immediate feedback on every session.',
   'Solo Developer', '2026', 0, '["JavaScript","HTML/CSS"]',
   'https://type-monk-e.pages.dev', NULL, '/images/projects/type-monk-e-shot.png', '/images/projects/icons/type-monk-e.svg', 4, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  -- ── Academic projects ────────────────────────────────────────
  ('ISakay', 'isakay', 'academic', 'web-app',
   'A client-server transportation ticketing web app that enables users to book rides with jeepney drivers by selecting travel schedules and reserving specific seats.',
   'A jeepney ticketing web app — passengers pick travel schedules and reserve seats, while drivers manage routes and manifests.',
   'A full-stack transportation ticketing system built for the local jeepney commuting experience. Passengers select travel schedules, view seat availability, and reserve seats; drivers manage their routes and manifests. Delivered as a capstone-scale client-server application.',
   'Project Leader, Lead Programmer, Full-Stack Developer', '2024', 1, '["PHP","JavaScript","MySQL","Bootstrap"]',
   NULL, NULL, NULL, NULL, 5, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Cryptopredictor', 'cryptopredictor', 'academic', 'ml-data',
   'Advanced forecasting software using machine learning to predict cryptocurrency price movements by analyzing historical data, market trends, and trading volumes.',
   'ML-driven forecasting that analyzes historical crypto data, market trends, and volumes to predict future price movements.',
   'A machine learning forecasting application that ingests historical crypto market data — prices, trends, and trading volumes — to model and predict potential price movements. Python-based with a Flask frontend and SQL data layer.',
   'Project Leader, Lead Programmer, Full-Stack Developer', '2024', 0, '["Python","scikit-learn","Flask","SQL"]',
   NULL, NULL, NULL, NULL, 6, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('ARventure', 'arventure', 'academic', 'ar-mobile',
   'An Augmented Reality Indoor Navigation Application that helps users navigate through buildings using AR technology, even in an offline setup.',
   'An offline AR indoor navigation app built with Unity — point your camera and follow AR overlays to navigate any building.',
   'An augmented reality indoor navigation app built with Unity. Users navigate buildings via AR overlays with no internet dependency — a fully offline indoor wayfinding experience using AR Foundation and Vuforia.',
   'Lead Programmer, Full-Stack Developer', '2024', 0, '["Unity","C#","AR Foundation"]',
   NULL, NULL, NULL, NULL, 7, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Aldrin Stream', 'aldrin-stream', 'academic', 'web-app',
   'A web application where users can watch videos in real time — either pre-uploaded videos played sequentially or live video streams — with a fully responsive design.',
   'A real-time video platform supporting both sequential playback of uploaded videos and live streaming in a responsive UI.',
   'A client-server video platform supporting both sequential playback of pre-uploaded videos and live streaming, delivered with a fully responsive interface.',
   'Project Leader, Lead Programmer, Full-Stack Developer', '2023', 0, '["PHP","JavaScript","MySQL","HTML/CSS"]',
   NULL, NULL, NULL, NULL, 8, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Kronos', 'kronos', 'academic', 'web-app',
   'A time tracking system for employees to log time in/out, enabling employers to accurately monitor and record working hours for attendance management.',
   'An employee time-in/time-out tracker that makes attendance management accurate — log hours, monitor work, and report easily.',
   'An employee time-tracking and attendance system. Employees log time in/out; employers monitor working hours and manage attendance records with reporting.',
   'Back-End Developer', '2023', 0, '["PHP","MySQL","JavaScript"]',
   NULL, NULL, NULL, NULL, 9, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Wordy', 'wordy', 'academic', 'game',
   'A competitive word game where players compete to form the longest possible word from a given set of letters.',
   'A competitive word game where players race to build the longest valid word from a shared set of letters to win the round.',
   'A competitive multiplayer word game — players race to build the longest valid word from a shared letter pool, with scoring and rounds.',
   'Full-Stack Developer', '2023', 0, '["PHP","JavaScript","MySQL","HTML/CSS"]',
   NULL, NULL, NULL, NULL, 10, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Chat System', 'chat-system', 'academic', 'networking',
   'A client-server application enabling real-time communication over a Local Area Network for seamless message exchange within the network.',
   'A client-server LAN chat application for real-time messaging — connect multiple clients and exchange messages instantly.',
   'A LAN-based messaging system demonstrating client-server architecture — real-time message exchange between connected clients over a local network.',
   'Full-Stack Developer', '2023', 0, '["PHP","JavaScript","MySQL","Sockets"]',
   NULL, NULL, NULL, NULL, 11, '2026-08-01 00:00:00', '2026-08-01 00:00:00');

INSERT INTO blog_posts
  (title, slug, excerpt, content, tags, published_at, created_at, updated_at)
VALUES
  ('My Journey from BSIT Graduate to Junior Front-End Developer',
   'my-journey-from-bsit-to-front-end-developer',
   'From capstone projects at Saint Louis University to shipping UIs in an Agile team — the story of my first year in the industry.',
   '# My Journey from BSIT Graduate to Junior Front-End Developer

## The beginning

I graduated with a **BS in Information Technology** from Saint Louis University in 2025. Like most fresh graduates, I had a stack of academic projects and no real-world experience. What I did have was a foundation: PHP, MySQL, JavaScript, and the discipline of building things from scratch.

## The capstone years

My academic projects were my real classroom. **ISakay** — a jeepney ticketing system — taught me full-stack architecture. **ARventure** pushed me into Unity and augmented reality. **Cryptopredictor** introduced me to machine learning with Python.

Each project taught me one lesson: *deliver something that works, then make it better.*

## The internship

At **NOAH Business Application** I wore the QA hat — testing features, finding bugs, documenting issues. It taught me that quality isn''t an afterthought; it''s a discipline.

## The first job

Now at **PRAXXYS SOLUTIONS** as a Junior Front-End Developer, I build UIs that match designs exactly using Vue, Nuxt, Ionic, Flutter, TypeScript, and Tailwind — all inside an Agile workflow with AI research and innovation on the side.

## What''s next

I''m focused on expanding into AI automation and AI engineering while continuing to ship quality front-end work. The stack changes, but the mindset stays the same: learn fast, build well, deliver on time.',
   '["career","frontend","journey"]', '2026-07-20 09:00:00', '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Building with Laravel + Ionic Vue: A Full-Stack Portfolio Architecture',
   'building-with-laravel-ionic-vue',
   'How I structured this very site — a Laravel API serving projects and posts by slug, consumed by an Ionic Vue frontend with Tailwind.',
   '# Building with Laravel + Ionic Vue

## The stack

This portfolio is a monorepo with two halves:

- **backend/** — Laravel 13 API (SQLite) that serves projects and blog posts with clean REST endpoints.
- **frontend/** — Ionic Vue + Tailwind CSS + TypeScript SPA that consumes the API.

## Why slugs?

Every project and blog post has a human-readable slug. That means routes like `/projects/isakay` instead of `/projects?id=5`. Slugs are better for SEO, shareable, and self-documenting.

## The API contract

```
GET  /api/v1/projects          → list, filterable by category/type/featured
GET  /api/v1/projects/{slug}   → single project
GET  /api/v1/blog/posts        → published posts
GET  /api/v1/blog/posts/{slug} → single post
POST /api/v1/contact           → contact form
```

## Design discipline

I took heavy design cues from bryllim.com — the monochrome palette, halftone dot textures, the fixed sidebar on desktop, and a mobile-first top bar. Everything is a reusable component: the sidebar, the theme switcher, the reveal animation, the project cards.

## Takeaway

A clean API + a component-driven frontend means the site stays easy to extend. Add a new project? Insert a row. Add a new page? Compose components.',
   '["laravel","ionic","vue","architecture"]', '2026-07-10 09:00:00', '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Why Every Developer Should Learn to Test Their Own Work',
   'why-every-developer-should-test-their-own-work',
   'My QA internship taught me that testing is not the enemy of speed — it is the thing that makes speed safe.',
   '# Why Every Developer Should Learn to Test Their Own Work

## The internship that changed my mind

I used to think testing was someone else''s job. Then I spent a semester as a **Quality Assurance Analyst intern** and everything flipped.

## What QA taught me

1. **Bugs are cheaper to find early.** A bug found during testing costs minutes. The same bug found in production costs hours and trust.
2. **Documentation is part of the work.** Writing clear issue reports forces you to actually understand the system.
3. **Consistency beats cleverness.** The best systems are boring and predictable.

## Applying it to development

Now, before I call a feature done, I run through it like a QA analyst: the happy path, the edge cases, the broken inputs, the slow network. It takes ten minutes and saves an entire debugging session later.

## The takeaway

Testing your own work is not a sign of doubt — it is a sign of professionalism. Ship things you would trust with your own time.',
   '["qa","testing","career"]', '2026-06-28 09:00:00', '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('Exploring Augmented Reality with Unity: What I Learned from ARventure',
   'exploring-augmented-reality-with-unity',
   'Building an offline AR indoor navigation app taught me more than C# — it taught me how to scope a wild idea into a shippable product.',
   '# Exploring Augmented Reality with Unity

## The idea

Navigate a building with AR overlays, fully offline. No GPS, no internet — just the camera, the floor plan, and AR Foundation.

## What I actually built

**ARventure** is an AR indoor navigation app built with:

- **Unity** for the 3D environment
- **AR Foundation** for plane detection and tracking
- **Vuforia** for image-based anchors
- **C#** for the logic

## The hard parts

- **Offline constraints** — no cloud services allowed, so all anchoring had to be local.
- **Tracking stability** — keeping the AR overlay glued to the real world while walking is harder than it looks.
- **Scope control** — an AR app can balloon quickly; we had to pick one building and one floor to make it real.

## What it taught me

Emerging tech projects are 20% shiny tech and 80% boring engineering. The AR part was the easy 20%. The scoping, the testing, the iteration — that''s where the real work lived.',
   '["unity","ar","mobile"]', '2026-06-15 09:00:00', '2026-08-01 00:00:00', '2026-08-01 00:00:00'),

  ('The Power of Reusable Components: Designing a Design System',
   'power-of-reusable-components',
   'When your button exists in one place, changing the design is a five-minute job instead of a weekend.',
   '# The Power of Reusable Components

## The problem

Scattered markup. Every page had its own button style, its own card layout, its own spacing. Changing anything meant hunting through the whole codebase.

## The fix

A small design system:

- **Tokens** — colors, fonts, spacing defined once in CSS variables.
- **Primitives** — Button, Card, Badge, SectionHeading as single components.
- **Composites** — pages assembled from primitives, never raw markup.

## The result

- Design changes are now **one-line edits**.
- New pages are **compositions**, not rewrites.
- The codebase reads like **one person wrote it** — because one system wrote it.

## The lesson

Reusability is not about avoiding repetition. It''s about making change cheap. Every component you build is a decision you only have to make once.',
   '["vue","design-system","architecture"]', '2026-05-30 09:00:00', '2026-08-01 00:00:00', '2026-08-01 00:00:00');

-- ────────────────────────────────────────────────────────────────
-- Admin account for the /aromin area.
-- Default credentials (same as the previous projects):
--   username: Aromin
--   password: 0xydmuhv!
-- OTP emails always go to the email below (aromintristan@gmail.com).
-- ────────────────────────────────────────────────────────────────
INSERT INTO admins (username, password_hash, email, created_at, updated_at)
VALUES ('Aromin', 'f58eba5aacfba1a273a76af5c48341ccac18ae04155fc3be778371fefc5326d9', 'aromintristan@gmail.com', '2026-08-09 00:00:00', '2026-08-09 00:00:00');

-- Visitor counter row.
INSERT INTO visitors (site, count, created_at, updated_at)
VALUES ('portfolio', 0, '2026-08-09 00:00:00', '2026-08-09 00:00:00');

-- ────────────────────────────────────────────────────────────────
-- Tech stack (mirrors frontend/src/data/profile.ts stackGroups).
-- ────────────────────────────────────────────────────────────────
INSERT INTO stack_groups (label, items, sort_order, created_at, updated_at)
VALUES
  ('Frontend', '["Vue","Nuxt","Ionic","TypeScript","JavaScript","Bootstrap","HTML","CSS"]', 0, '2026-08-09 00:00:00', '2026-08-09 00:00:00'),
  ('Backend', '["Laravel","PHP","Node.js","MySQL","SQLite","WordPress","Joomla"]', 1, '2026-08-09 00:00:00', '2026-08-09 00:00:00'),
  ('Mobile & Desktop', '["Flutter","Kotlin","Android Studio","C#","Unity","C++","C","Java"]', 2, '2026-08-09 00:00:00', '2026-08-09 00:00:00'),
  ('AI & Data', '["Python","Machine Learning","Data Analytics","SQL"]', 3, '2026-08-09 00:00:00', '2026-08-09 00:00:00'),
  ('Developer Tools', '["Git","GitHub","VS Code"]', 4, '2026-08-09 00:00:00', '2026-08-09 00:00:00'),
  ('Design', '["Figma","Canva"]', 5, '2026-08-09 00:00:00', '2026-08-09 00:00:00');
