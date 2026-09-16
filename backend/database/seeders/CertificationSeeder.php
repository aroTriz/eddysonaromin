<?php

namespace Database\Seeders;

use App\Models\Certification;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Seeds the initial certifications — mirrors the static `certifications`
 * array that used to live in frontend/src/data/profile.ts.
 * Transferred to DB so CMS edits reflect live.
 */
class CertificationSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $certifications = [
            [
                'slug' => 'bachelor-of-science-in-information-technology',
                'title' => 'Bachelor of Science in Information Technology',
                'issuer' => 'Saint Louis University (SAMCIS)',
                'year' => '2025',
                'category' => 'degree',
                'summary' => 'Four-year undergraduate degree in Information Technology at Saint Louis University — covering software development, web technologies, databases, networking, and information systems, capped by a full-stack capstone project (ISakay).',
                'sort_order' => 0,
            ],
            [
                'slug' => 'agile-fast-phased-development',
                'title' => 'Agile & Fast-Phased Development',
                'issuer' => 'PRAXXYS Solutions Inc.',
                'year' => '2026',
                'category' => 'certification',
                'summary' => 'Company credential from PRAXXYS Solutions Inc. on agile methodology and fast-phased delivery — the working practices used on real client web and mobile work in an agile development team.',
                'sort_order' => 1,
            ],
            [
                'slug' => 'quality-assurance-testing',
                'title' => 'Quality Assurance & Testing',
                'issuer' => 'NOAH Business Application',
                'year' => '2025',
                'category' => 'certification',
                'summary' => 'QA credential from NOAH Business Application covering the full quality assurance discipline — test case authoring, bug and regression tracking, and documentation review for release readiness.',
                'sort_order' => 2,
            ],
        ];

        foreach ($certifications as $cert) {
            Certification::firstOrCreate(['slug' => $cert['slug']], $cert);
        }
    }
}
