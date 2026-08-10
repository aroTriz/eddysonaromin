<?php

namespace Database\Seeders;

use App\Models\Recommendation;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Seeds the initial testimonials — mirrors the static `recommendations`
 * array that used to live in frontend/src/data/profile.ts.
 */
class RecommendationSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $recommendations = [
            [
                'initials' => 'LF',
                'quote' => '"Eddyson is a dedicated and talented developer. His capstone project demonstrated exceptional technical skill and problem-solving ability. He consistently delivers quality work."',
                'author' => 'Lambert Famorca',
                'role' => 'Instructor, SLU · Founder, MyVirtual Learning',
                'email' => null,
                'sort_order' => 0,
            ],
            [
                'initials' => 'BB',
                'quote' => '"Eddyson consistently delivered polished, responsive interfaces that matched the designs exactly. His attention to detail and reliable output made him a pleasure to work with."',
                'author' => 'Britannyy Baldovino',
                'role' => 'University Instructor — Saint Louis University',
                'email' => null,
                'sort_order' => 1,
            ],
            [
                'initials' => 'PS',
                'quote' => '"A dependable developer who integrated APIs cleanly and kept quality high in a fast-paced environment. Always proactive, always on time."',
                'author' => 'PRAXXYS Solutions Inc. Team',
                'role' => 'Agile Development — Junior Front-End Developer',
                'email' => null,
                'sort_order' => 2,
            ],
            [
                'initials' => 'NO',
                'quote' => '"His QA discipline was exceptional — thorough test cases, clear documentation, and a sharp eye for bugs that others missed. Features shipped better because of him."',
                'author' => 'NOAH Business Application Team',
                'role' => 'QA Internship — Makati City',
                'email' => null,
                'sort_order' => 3,
            ],
            [
                'initials' => 'IS',
                'quote' => '"As project lead on ISakay, Eddyson owned the full stack — from database design to the booking flow. He kept the team on schedule and the codebase clean."',
                'author' => 'ISakay Capstone Team',
                'role' => 'Transportation Ticketing Web App',
                'email' => null,
                'sort_order' => 4,
            ],
            [
                'initials' => 'AR',
                'quote' => '"Bringing ARventure to life took real grit — offline AR navigation is hard. Eddyson pushed through every tracking issue and shipped a working demo."',
                'author' => 'ARventure Team',
                'role' => 'Augmented Reality Project — Unity',
                'email' => null,
                'sort_order' => 5,
            ],
        ];

        foreach ($recommendations as $rec) {
            Recommendation::firstOrCreate(['author' => $rec['author']], $rec);
        }
    }
}
