<?php

namespace Database\Seeders;

use App\Models\Experience;
use Illuminate\Database\Seeder;

class ExperienceSeeder extends Seeder
{
    /**
     * Seed the portfolio experiences. Safe to re-run: rows are matched by
     * company + title, so existing entries update instead of duplicating.
     */
    public function run(): void
    {
        $experiences = [
            [
                'type' => 'experience',
                'period' => '2025 - Present',
                'year' => '2025 - Present',
                'tag' => 'Freelance',
                'title' => 'Founder & Lead Developer',
                'company' => 'codED',
                'logo_url' => '/images/logos/coded-logo.svg',
                'website_url' => 'https://coded-freelance.pages.dev/',
                'tooltip_desc' => 'My freelancing studio — websites, mobile apps, and commissioned IT systems.',
                'albums' => [],
                'certificates' => [],
                'description' => 'Owner of codED, my freelancing company run on the side. We build websites, mobile apps, and other commissioned IT systems for clients — every project designed, developed, and delivered by me alongside full-time work.',
                'highlights' => [
                    'Founded and run a sideline freelance studio serving commissioned clients',
                    'Design and build custom websites end to end, from sketch to deployment',
                    'Develop mobile apps and bespoke IT systems tailored to client needs',
                    'Own client communication, scoping, delivery, and after-care',
                ],
                'sort_order' => 0,
            ],
        ];

        foreach ($experiences as $experience) {
            Experience::updateOrCreate(
                ['company' => $experience['company'], 'title' => $experience['title']],
                $experience
            );
        }
    }
}
