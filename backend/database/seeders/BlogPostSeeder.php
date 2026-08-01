<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use Illuminate\Database\Seeder;

class BlogPostSeeder extends Seeder
{
    /**
     * Seed the application's blog posts.
     */
    public function run(): void
    {
        $posts = [
            [
                'title' => 'My Journey from BSIT Graduate to Junior Front-End Developer',
                'slug' => 'my-journey-from-bsit-to-front-end-developer',
                'excerpt' => 'From capstone projects at Saint Louis University to shipping UIs in an Agile team — the story of my first year in the industry.',
                'content' => "# My Journey from BSIT Graduate to Junior Front-End Developer\n\n## The beginning\n\nI graduated with a **BS in Information Technology** from Saint Louis University in 2025. Like most fresh graduates, I had a stack of academic projects and no real-world experience. What I did have was a foundation: PHP, MySQL, JavaScript, and the discipline of building things from scratch.\n\n## The capstone years\n\nMy academic projects were my real classroom. **ISakay** — a jeepney ticketing system — taught me full-stack architecture. **ARventure** pushed me into Unity and augmented reality. **Cryptopredictor** introduced me to machine learning with Python.\n\nEach project taught me one lesson: *deliver something that works, then make it better.*\n\n## The internship\n\nAt **NOAH Business Application** I wore the QA hat — testing features, finding bugs, documenting issues. It taught me that quality isn't an afterthought; it's a discipline.\n\n## The first job\n\nNow at **PRAXXYS SOLUTIONS** as a Junior Front-End Developer, I build UIs that match designs exactly using Vue, Nuxt, Ionic, Flutter, TypeScript, and Tailwind — all inside an Agile workflow with AI research and innovation on the side.\n\n## What's next\n\nI'm focused on expanding into AI automation and AI engineering while continuing to ship quality front-end work. The stack changes, but the mindset stays the same: learn fast, build well, deliver on time.",
                'tags' => ['career', 'frontend', 'journey'],
                'published_at' => '2026-07-20 09:00:00',
            ],
            [
                'title' => 'Building with Laravel + Ionic Vue: A Full-Stack Portfolio Architecture',
                'slug' => 'building-with-laravel-ionic-vue',
                'excerpt' => 'How I structured this very site — a Laravel API serving projects and posts by slug, consumed by an Ionic Vue frontend with Tailwind.',
                'content' => "# Building with Laravel + Ionic Vue\n\n## The stack\n\nThis portfolio is a monorepo with two halves:\n\n- **backend/** — Laravel 13 API (SQLite) that serves projects and blog posts with clean REST endpoints.\n- **frontend/** — Ionic Vue + Tailwind CSS + TypeScript SPA that consumes the API.\n\n## Why slugs?\n\nEvery project and blog post has a human-readable slug. That means routes like `/projects/isakay` instead of `/projects?id=5`. Slugs are better for SEO, shareable, and self-documenting.\n\n## The API contract\n\n```\nGET  /api/v1/projects          → list, filterable by category/type/featured\nGET  /api/v1/projects/{slug}   → single project\nGET  /api/v1/blog/posts        → published posts\nGET  /api/v1/blog/posts/{slug} → single post\nPOST /api/v1/contact           → contact form\n```\n\n## Design discipline\n\nI took heavy design cues from bryllim.com — the monochrome palette, halftone dot textures, the fixed sidebar on desktop, and a mobile-first top bar. Everything is a reusable component: the sidebar, the theme switcher, the reveal animation, the project cards.\n\n## Takeaway\n\nA clean API + a component-driven frontend means the site stays easy to extend. Add a new project? Insert a row. Add a new page? Compose components.",
                'tags' => ['laravel', 'ionic', 'vue', 'architecture'],
                'published_at' => '2026-07-10 09:00:00',
            ],
            [
                'title' => 'Why Every Developer Should Learn to Test Their Own Work',
                'slug' => 'why-every-developer-should-test-their-own-work',
                'excerpt' => 'My QA internship taught me that testing is not the enemy of speed — it is the thing that makes speed safe.',
                'content' => "# Why Every Developer Should Learn to Test Their Own Work\n\n## The internship that changed my mind\n\nI used to think testing was someone else's job. Then I spent a semester as a **Quality Assurance Analyst intern** and everything flipped.\n\n## What QA taught me\n\n1. **Bugs are cheaper to find early.** A bug found during testing costs minutes. The same bug found in production costs hours and trust.\n2. **Documentation is part of the work.** Writing clear issue reports forces you to actually understand the system.\n3. **Consistency beats cleverness.** The best systems are boring and predictable.\n\n## Applying it to development\n\nNow, before I call a feature done, I run through it like a QA analyst: the happy path, the edge cases, the broken inputs, the slow network. It takes ten minutes and saves an entire debugging session later.\n\n## The takeaway\n\nTesting your own work is not a sign of doubt — it is a sign of professionalism. Ship things you would trust with your own time.",
                'tags' => ['qa', 'testing', 'career'],
                'published_at' => '2026-06-28 09:00:00',
            ],
            [
                'title' => 'Exploring Augmented Reality with Unity: What I Learned from ARventure',
                'slug' => 'exploring-augmented-reality-with-unity',
                'excerpt' => 'Building an offline AR indoor navigation app taught me more than C# — it taught me how to scope a wild idea into a shippable product.',
                'content' => "# Exploring Augmented Reality with Unity\n\n## The idea\n\nNavigate a building with AR overlays, fully offline. No GPS, no internet — just the camera, the floor plan, and AR Foundation.\n\n## What I actually built\n\n**ARventure** is an AR indoor navigation app built with:\n\n- **Unity** for the 3D environment\n- **AR Foundation** for plane detection and tracking\n- **Vuforia** for image-based anchors\n- **C#** for the logic\n\n## The hard parts\n\n- **Offline constraints** — no cloud services allowed, so all anchoring had to be local.\n- **Tracking stability** — keeping the AR overlay glued to the real world while walking is harder than it looks.\n- **Scope control** — an AR app can balloon quickly; we had to pick one building and one floor to make it real.\n\n## What it taught me\n\nEmerging tech projects are 20% shiny tech and 80% boring engineering. The AR part was the easy 20%. The scoping, the testing, the iteration — that's where the real work lived.",
                'tags' => ['unity', 'ar', 'mobile'],
                'published_at' => '2026-06-15 09:00:00',
            ],
            [
                'title' => 'The Power of Reusable Components: Designing a Design System',
                'slug' => 'power-of-reusable-components',
                'excerpt' => 'When your button exists in one place, changing the design is a five-minute job instead of a weekend.',
                'content' => "# The Power of Reusable Components\n\n## The problem\n\nScattered markup. Every page had its own button style, its own card layout, its own spacing. Changing anything meant hunting through the whole codebase.\n\n## The fix\n\nA small design system:\n\n- **Tokens** — colors, fonts, spacing defined once in CSS variables.\n- **Primitives** — Button, Card, Badge, SectionHeading as single components.\n- **Composites** — pages assembled from primitives, never raw markup.\n\n## The result\n\n- Design changes are now **one-line edits**.\n- New pages are **compositions**, not rewrites.\n- The codebase reads like **one person wrote it** — because one system wrote it.\n\n## The lesson\n\nReusability is not about avoiding repetition. It's about making change cheap. Every component you build is a decision you only have to make once.",
                'tags' => ['vue', 'design-system', 'architecture'],
                'published_at' => '2026-05-30 09:00:00',
            ],
        ];

        foreach ($posts as $post) {
            BlogPost::updateOrCreate(['slug' => $post['slug']], $post);
        }
    }
}
