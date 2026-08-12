<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Censored words — the community chat profanity list, stored in the DB so
 * it can be extended quickly without deploying code.
 *
 *   kind: 'loose'  → substring match (catches "fucking", "putanginamo")
 *         'strict' → whole-word match only (catches "ass" but not "class")
 *   lang: 'en' | 'fil' — informational grouping only; matching is language-blind.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('censored_words', function (Blueprint $table) {
            $table->id();
            $table->string('word', 60);
            $table->string('kind', 10)->default('loose');     // loose | strict
            $table->string('lang', 10)->default('en');        // en | fil
            $table->timestamps();

            $table->unique('word');
            $table->index(['kind', 'lang']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('censored_words');
    }
};
