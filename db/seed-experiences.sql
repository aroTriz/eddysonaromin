-- Seed: experiences + education from profile.ts (original static data)
-- Date: 2026-08-24
-- Idempotent: INSERT OR REPLACE ensures re-running on deploy is safe.

-- Experiences
INSERT OR REPLACE INTO experiences
  (id, type, period, year, tag, title, company, logo_url, website_url, tooltip_desc,
   albums, certificates, description, highlights, sort_order, created_at, updated_at)
VALUES
  (1, 'experience', 'Nov 2025 – Jun 2026', '2025 – 2026', 'Professional',
   'Junior Front-End Developer', 'PRAXXYS Solutions Inc.',
   '/images/logos/praxxys-logo.png', 'https://www.praxxys.ph/',
   'An AI, e-commerce, web, and mobile app design & development company.',
   '[]', '[]',
   'Working in an Agile/Fast Phased development environment. Developing user interfaces that match designs exactly using modern frameworks. Collaborating on mobile and web development with AI research and innovation.',
   '["Developed UIs matching designs exactly using Vue, Nuxt, Ionic, Flutter, TypeScript, Tailwind, and Laravel","Backend API integration and client demonstrations","Bug finding, QA, and maintaining coding standards","AI Research and Innovation initiatives","Maintained consistency and efficiency across all outputs"]',
   1, datetime('now'), datetime('now')),

  (2, 'experience', 'Jan – Apr 2025', '2025', 'Internship',
   'Quality Assurance Analyst & Business Application Developer', 'NOAH Business Application',
   '/images/logos/noah-logo.png', 'https://noahapplication.com/',
   'A business applications company providing document management and workflow automation solutions.',
   '[]', '[]',
   'University Internship at Makati City, Metro Manila. Ensured system features and elements met company standards through rigorous testing and documentation.',
   '["Careful testing of system features and functionality","Bug finding and issue identification","Documenting issues and maintaining consistency across outputs","Ensured all features met company quality standards"]',
   2, datetime('now'), datetime('now')),

  (3, 'education', '2021 – 2025', '2021 – 2025', 'Graduated',
   'BS Information Technology', 'Saint Louis University',
   '/images/logos/slu-logo.svg', 'https://www.slu.edu.ph/',
   'A premier Catholic university in Baguio City known for engineering, IT, and health sciences programs.',
   '[]', '[]',
   'SAMCIS | Bachelor of Science in Information Technology. Baguio City, Benguet, Philippines.',
   '[]',
   3, datetime('now'), datetime('now'));
