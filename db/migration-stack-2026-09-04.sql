-- Stack sync 2026-09-04 — updates D1 to match frontend/src/data/profile.ts (includes Discord, Mattermost, Hugging Face, Anthropic, Trello, Prettier, Opencode etc.)
DELETE FROM stack_groups;
INSERT INTO stack_groups (label, items, sort_order, created_at, updated_at) VALUES
  ('Frontend', '["Vue","Nuxt","React","TypeScript","JavaScript","Bootstrap","HTML","CSS"]', 0, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Backend', '["Laravel","PHP","Node.js"]', 1, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Database', '["MySQL","SQLite"]', 2, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('CMS', '["WordPress","Joomla"]', 3, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Mobile & Desktop', '["Flutter","Kotlin","C#","Unity","C++","C","Java","Ionic","Android Studio"]', 4, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Machine Learning and Data', '["Python","Machine Learning","Data Analytics","Anaconda","Jupyter"]', 5, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('AI & Assistant', '["Hermes","OpenClaw","OpenAI","DeepSeek","Grok","BigPickle","Muse Spark","Claude","Ollama","Gemini","Higgsfield","Hugging Face","Anthropic","Opencode"]', 6, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Version Control & CI/CD', '["Git","GitHub","GitLab"]', 7, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Developer Tools', '["VS Code","IntelliJ IDEA","PyCharm","DBeaver","Prettier","XAMPP","WAMP"]', 8, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Hosting & Deployment', '["Vercel","Cloudflare","Docker"]', 9, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('OS', '["Windows","macOS","Ubuntu"]', 10, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Networking', '["Cisco Packet Tracer"]', 11, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Package Management', '["npm","Composer"]', 12, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Design', '["Figma","Canva"]', 13, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Communication', '["Discord","Mattermost"]', 14, '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
  ('Project Management', '["Trello"]', 15, '2026-09-04 00:00:00', '2026-09-04 00:00:00');
