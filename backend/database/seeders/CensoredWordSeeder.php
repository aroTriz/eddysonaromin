<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seed the community-chat censor list — vulgar + racist words in English
 * and Filipino. `loose` words match anywhere in a string (handles word
 * forms like "fucking", "putanginamo"); `strict` words match as a whole
 * word only (so "ass" doesn't hit "class").
 *
 * Re-run with:  php artisan db:seed --class=CensoredWordSeeder
 */
class CensoredWordSeeder extends Seeder
{
    public function run(): void
    {
        $words = [
            // ── English — vulgar (loose: catches forms) ──────────────
            ['fuck', 'loose', 'en'],
            ['motherfuck', 'loose', 'en'],
            ['fuckhead', 'loose', 'en'],
            ['shit', 'loose', 'en'],
            ['bullshit', 'loose', 'en'],
            ['bitch', 'loose', 'en'],
            ['asshole', 'loose', 'en'],
            ['cunt', 'loose', 'en'],
            ['dickhead', 'loose', 'en'],
            ['jackass', 'loose', 'en'],
            ['dumbass', 'loose', 'en'],
            ['cocksuck', 'loose', 'en'],
            ['dipshit', 'loose', 'en'],
            ['douchebag', 'loose', 'en'],
            ['bastard', 'loose', 'en'],
            ['motherfucker', 'loose', 'en'],
            ['sonofabitch', 'loose', 'en'],
            ['bitchass', 'loose', 'en'],
            ['pissed', 'loose', 'en'],
            ['bullshitter', 'loose', 'en'],

            // ── English — vulgar (strict: whole word only) ───────────
            ['ass', 'strict', 'en'],
            ['dick', 'strict', 'en'],
            ['cock', 'strict', 'en'],
            ['prick', 'strict', 'en'],
            ['slut', 'strict', 'en'],
            ['whore', 'strict', 'en'],
            ['twat', 'strict', 'en'],
            ['wank', 'strict', 'en'],
            ['piss', 'strict', 'en'],
            ['pussy', 'strict', 'en'],
            ['bimbo', 'strict', 'en'],
            ['hoe', 'strict', 'en'],
            ['jackoff', 'strict', 'en'],

            // ── English — racist / slur (loose) ──────────────────────
            ['nigger', 'loose', 'en'],
            ['nigga', 'loose', 'en'],
            ['kike', 'loose', 'en'],
            ['spic', 'loose', 'en'],
            ['wetback', 'loose', 'en'],
            ['chink', 'loose', 'en'],
            ['gook', 'loose', 'en'],
            ['coon', 'loose', 'en'],
            ['cracker', 'loose', 'en'],
            ['beaner', 'loose', 'en'],
            ['raghead', 'loose', 'en'],
            ['towelhead', 'loose', 'en'],
            ['sandnigger', 'loose', 'en'],
            ['faggot', 'loose', 'en'],
            ['fag', 'strict', 'en'],
            ['dyke', 'strict', 'en'],
            ['tranny', 'loose', 'en'],
            ['retard', 'loose', 'en'],
            ['mongoloid', 'loose', 'en'],

            // ── Filipino — vulgar (loose) ─────────────────────────────
            ['putangina', 'loose', 'fil'],
            ['putang ina', 'loose', 'fil'],
            ['putanginamo', 'loose', 'fil'],
            ['tangina', 'loose', 'fil'],
            ['tang ina', 'loose', 'fil'],
            ['taena', 'loose', 'fil'],
            ['kingina', 'loose', 'fil'],
            ['pakshet', 'loose', 'fil'],
            ['pakyu', 'loose', 'fil'],
            ['hinayupak', 'loose', 'fil'],
            ['hindot', 'loose', 'fil'],
            ['hindut', 'loose', 'fil'],
            ['buwiset', 'loose', 'fil'],
            ['bwisit', 'loose', 'fil'],
            ['tarantado', 'loose', 'fil'],
            ['gago', 'loose', 'fil'],
            ['gaga', 'loose', 'fil'],
            ['ulol', 'loose', 'fil'],
            ['kupal', 'loose', 'fil'],
            ['gunggong', 'loose', 'fil'],
            ['walang hiya', 'loose', 'fil'],
            ['walanghiya', 'loose', 'fil'],
            ['hayop ka', 'loose', 'fil'],
            ['hayopkamo', 'loose', 'fil'],
            ['anak ng puta', 'loose', 'fil'],
            ['sira ulo', 'loose', 'fil'],
            ['bobo ka', 'loose', 'fil'],
            ['tanga ka', 'loose', 'fil'],
            ['pokpok', 'loose', 'fil'],
            ['burat', 'loose', 'fil'],
            ['kantot', 'loose', 'fil'],
            ['katorse', 'loose', 'fil'],
            ['salsal', 'loose', 'fil'],
            ['salsalan', 'loose', 'fil'],
            ['jakol', 'loose', 'fil'],
            ['puke', 'loose', 'fil'],
            ['pepe', 'loose', 'fil'],

            // ── Filipino — vulgar (strict) ────────────────────────────
            ['puta', 'strict', 'fil'],
            ['tanga', 'strict', 'fil'],
            ['bobo', 'strict', 'fil'],
            ['tite', 'strict', 'fil'],
            ['titi', 'strict', 'fil'],
            ['puki', 'strict', 'fil'],
            ['pekpek', 'strict', 'fil'],
            ['leche', 'strict', 'fil'],
            ['peste', 'strict', 'fil'],
            ['lintik', 'strict', 'fil'],
            ['ungas', 'strict', 'fil'],
            ['inutil', 'strict', 'fil'],
            ['loko', 'strict', 'fil'],
            ['lokang', 'strict', 'fil'],

            // ── Filipino — racist / derogatory (loose) ────────────────
            ['negro', 'loose', 'fil'],
            ['negra', 'loose', 'fil'],
            ['indio', 'loose', 'fil'],
            ['taong grasa', 'loose', 'fil'],
            ['badjao', 'loose', 'fil'],      // used as a slur in some contexts
            ['ayta', 'loose', 'fil'],        // derogatory for Aeta
            ['pugot', 'loose', 'fil'],       // derogatory for Igorot
        ];

        // Insert only words that are not already in the table (idempotent).
        $existing = DB::table('censored_words')->pluck('word')->flip();

        $now = now();
        $rows = [];
        foreach ($words as [$word, $kind, $lang]) {
            if ($existing->has($word)) {
                continue;
            }
            $rows[] = [
                'word' => $word,
                'kind' => $kind,
                'lang' => $lang,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if ($rows !== []) {
            DB::table('censored_words')->insert($rows);
        }
    }
}
