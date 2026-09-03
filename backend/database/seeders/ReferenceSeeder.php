<?php

namespace Database\Seeders;

use App\Models\Reference;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds the initial references — mirrors the static `references`
 * array that used to live in frontend/src/data/profile.ts.
 * Keeps existing data intact via firstOrCreate on slug.
 */
class ReferenceSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $references = [
            [
                'slug' => 'britannyy-baldovino',
                'initials' => 'BB',
                'name' => 'Britannyy Baldovino',
                'title' => 'University Instructor — Saint Louis University',
                'email' => 'bmbaldovino@slu.edu.ph',
                'summary' => 'University instructor at Saint Louis University who supervised and mentored academic work — can speak to technical skill, attention to detail, and consistent delivery.',
                'sort_order' => 0,
            ],
            [
                'slug' => 'lambert-famorca',
                'initials' => 'LF',
                'name' => 'Lambert Famorca',
                'title' => 'University Instructor — Saint Louis University',
                'email' => 'support@myvirtuallearning.org',
                'summary' => 'University instructor at Saint Louis University and founder of MyVirtual Learning — connected through the ISakay capstone mentorship community.',
                'sort_order' => 1,
            ],
            [
                'slug' => 'praxxys-solutions',
                'initials' => 'PS',
                'name' => 'PRAXXYS Solutions Inc.',
                'title' => 'Junior Front-End Developer — Agile Development Team',
                'email' => null,
                'photo_url' => '/images/logos/praxxys-logo.png',
                'summary' => 'PRAXXYS Solutions Inc. — agile web & mobile engineering team where I served as Junior Front-End Developer. Can speak to clean API integration, consistent quality under fast-paced deadlines, and proactive ownership of shipped features.',
                'sort_order' => 2,
            ],
        ];

        foreach ($references as $ref) {
            $model = Reference::firstOrCreate(['slug' => $ref['slug']], $ref);
            // Ensure photo_url is set for PRAXXYS even if row already existed (same as experience logo).
            if (isset($ref['photo_url']) && $model->photo_url !== $ref['photo_url']) {
                $model->update(['photo_url' => $ref['photo_url']]);
            }
        }
    }
}
