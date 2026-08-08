<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stack CMS — categories (label) each holding a JSON list of technologies,
 * managed from the /aromin admin area. Mirrors the static stackGroups in
 * frontend/src/data/profile.ts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stack_groups', function (Blueprint $table) {
            $table->id();
            $table->string('label')->unique();
            $table->json('items')->default('[]'); // array of tech names
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stack_groups');
    }
};
