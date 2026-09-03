<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * References CMS — professional references (name, initials, title, email,
 * summary), managed from the /aromin admin area. Mirrors the static
 * references array that used to live in frontend/src/data/profile.ts.
 * Standalone from recommendations & certifications — own table, own routes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('references', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('initials', 8);
            $table->string('name');
            $table->string('title');
            $table->string('email')->nullable();
            $table->text('summary')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('references');
    }
};
