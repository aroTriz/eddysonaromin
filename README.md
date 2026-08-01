# eddysonaromin

Personal portfolio for **Eddyson Tristan B. Aromin** — a full-stack monorepo inspired by the design language of [bryllim.com](https://bryllim.com) (Geist type family, monochrome palette, halftone textures) with content drawn from the developer's own resume.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Ionic Vue 8 · Vue 3 · TypeScript · Tailwind CSS 4 · Vite 8 · Vue Router · lucide-vue-next |
| **Backend** | Laravel 13 · PHP 8.3 · SQLite (REST API) |
| **Hosting** | Local development servers (`php artisan serve` + Vite) |

## Repository Layout

```
eddysonaromin/
├── backend/                  # Laravel 13 API
│   ├── app/Http/Controllers/Api/   # ProjectController, BlogPostController, ContactController
│   ├── app/Models/                  # Project, BlogPost, ContactMessage
│   ├── database/seeders/            # Real portfolio content
│   └── routes/api.php               # API contract
└── frontend/                 # Ionic Vue + Tailwind SPA
    ├── src/
    │   ├── assets/styles/main.css   # Design system (tokens, halftone, theme)
    │   ├── components/              # Reusable UI (shell, cards, async states)
    │   ├── composables/             # useTheme (light/dark/system)
    │   ├── data/profile.ts          # Static profile content
    │   ├── router/                  # Slug-based routes
    │   ├── services/api.ts          # API client
    │   ├── types/                   # Shared TS types
    │   ├── utils/format.ts          # Type labels & helpers
    │   └── views/                   # Pages
```

## API Contract

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/projects` | List projects (`?category=`, `?type=`, `?featured=1`) |
| GET | `/api/v1/projects/{slug}` | Project detail by slug |
| GET | `/api/v1/blog/posts` | Published posts |
| GET | `/api/v1/blog/posts/{slug}` | Post detail by slug |
| POST | `/api/v1/contact` | Contact form (validated) |

## Getting Started

### Prerequisites

- Node.js 20+ · npm
- PHP 8.2+ with `pdo_sqlite`, `mbstring`, `openssl`, `curl`
- [Composer](https://getcomposer.org/)

### 1. Backend (Laravel API)

```bash
cd backend
composer install
copy .env.example .env        # Windows — or: cp .env.example .env
php artisan key:generate
php artisan migrate --seed    # creates SQLite DB + seeds projects & posts
php artisan serve --port=8000
```

### 2. Frontend (Ionic Vue SPA)

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api → :8000)
```

Open **http://localhost:5173**.

### Production build

```bash
cd frontend && npm run build   # type-checks with vue-tsc, then bundles to dist/
```

## Design Notes

- **Design system**: `frontend/src/assets/styles/main.css` — CSS-variable monochrome palette (flips via `html.dark`), Geist / Geist Mono / Geist Pixel / Source Serif 4 fonts, halftone dot textures with mask gradients.
- **Theme**: light / dark / system toggle with circular View Transition reveal, persisted in `localStorage` (`useTheme` composable).
- **Responsive**: fixed left sidebar ≥1024px; sticky top bar + fullscreen menu below; no horizontal scroll from 320px up.
- **Slugs**: projects and blog posts route by slug (`/projects/isakay`, `/blog/my-journey-from-bsit-to-front-end-developer`).
- **Reusability**: shared components for cards, tags, async states (loading/error/empty), section headings, reveals, and the theme switcher — the site reads like one author wrote it.

## Credits

- Design reference: [bryllim.com](https://bryllim.com)
- Fonts: [Geist](https://vercel.com/font) by Vercel
- Icons: [lucide](https://lucide.dev)
