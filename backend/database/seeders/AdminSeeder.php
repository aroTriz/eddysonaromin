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
 *   username: Aromin15
 *   password: 0xydmuhv!
 *
 * OTP emails always go to the email stored here (aromintristan@gmail.com).
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('admins')->updateOrInsert(
            ['username' => 'Aromin15'],
            [
                'password_hash' => 'f58eba5aacfba1a273a76af5c48341ccac18ae04155fc3be778371fefc5326d9',
                'email' => 'aromintristan@gmail.com',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Private-chat account for the admin — visitors DM THIS user. The
        // password is a throwaway hash (the admin never signs in through the
        // public login; they reply from the /aromin area instead).
        $userId = DB::table('users')->where('email', 'aromintristan@gmail.com')->value('id');
        if (! $userId) {
            $userId = DB::table('users')->insertGetId([
                'name' => 'Eddyson Aromin',
                'email' => 'aromintristan@gmail.com',
                'password' => hash('sha256', 'not-a-login-account-' . bin2hex(random_bytes(8))),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('admins')->where('username', 'Aromin15')->update(['user_id' => $userId]);

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
            'Frontend' => ['Vue', 'Nuxt', 'React', 'TypeScript', 'JavaScript', 'Bootstrap', 'HTML', 'CSS'],
            'Backend' => ['Laravel', 'PHP', 'Node.js'],
            'Database' => ['MySQL', 'SQLite'],
            'CMS' => ['WordPress', 'Joomla'],
            'Mobile & Desktop' => ['Flutter', 'Kotlin', 'C#', 'Unity', 'C++', 'C', 'Java', 'Ionic', 'Android Studio'],
            'Machine Learning and Data' => ['Python', 'Machine Learning', 'Data Analytics', 'Anaconda', 'Jupyter'],
            'AI & Assistant' => ['Hermes', 'OpenClaw', 'OpenAI', 'DeepSeek', 'Grok', 'BigPickle', 'Muse Spark', 'Claude', 'Ollama', 'Gemini', 'Higgsfield', 'Hugging Face', 'Anthropic', 'Opencode'],
            'Version Control & CI/CD' => ['Git', 'GitHub', 'GitLab'],
            'Developer Tools' => ['VS Code', 'IntelliJ IDEA', 'PyCharm', 'DBeaver', 'Prettier', 'XAMPP', 'WAMP'],
            'Hosting & Deployment' => ['Vercel', 'Cloudflare', 'Docker'],
            'OS' => ['Windows', 'macOS', 'Ubuntu'],
            'Networking' => ['Cisco Packet Tracer'],
            'Package Management' => ['npm', 'Composer'],
            'Design' => ['Figma', 'Canva'],
            'Communication' => ['Discord', 'Mattermost'],
            'Project Management' => ['Trello'],
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
