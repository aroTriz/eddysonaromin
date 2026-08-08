<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the admin account for the /aromin admin area plus the
 * visitor counter row. The password hash is SHA-256 (hex) — the same
 * scheme the Cloudflare Pages Functions use, so local and prod agree.
 *
 * Default credentials (same as the previous projects):
 *   username: Aromin
 *   password: 0xydmuhv!
 *
 * OTP emails always go to the email stored here (aromintristan@gmail.com).
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('admins')->updateOrInsert(
            ['username' => 'Aromin'],
            [
                'password_hash' => 'f58eba5aacfba1a273a76af5c48341ccac18ae04155fc3be778371fefc5326d9',
                'email' => 'aromintristan@gmail.com',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('visitors')->updateOrInsert(
            ['site' => 'portfolio'],
            [
                'count' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Seed the tech stack (mirrors frontend/src/data/profile.ts stackGroups).
        $stack = [
            'Frontend' => ['Vue', 'Nuxt', 'Ionic', 'TypeScript', 'JavaScript', 'Bootstrap', 'HTML', 'CSS'],
            'Backend' => ['Laravel', 'PHP', 'Node.js', 'MySQL', 'SQLite', 'WordPress', 'Joomla'],
            'Mobile & Desktop' => ['Flutter', 'Kotlin', 'Android Studio', 'C#', 'Unity', 'C++', 'C', 'Java'],
            'AI & Data' => ['Python', 'Machine Learning', 'Data Analytics', 'SQL'],
            'Developer Tools' => ['Git', 'GitHub', 'VS Code'],
            'Design' => ['Figma', 'Canva'],
        ];

        foreach ($stack as $label => $items) {
            DB::table('stack_groups')->updateOrInsert(
                ['label' => $label],
                [
                    'items' => json_encode($items),
                    'sort_order' => array_search($label, array_keys($stack)),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
