<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Recommendations CMS — testimonial cards (initials, quote, author, role,
 * optional contact email), managed from the /aromin admin area. Mirrors the
 * static recommendations in frontend/src/data/profile.ts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recommendations', function (Blueprint $table) {
            $table->id();
            $table->string('initials', 8);
            $table->text('quote');
            $table->string('author');
            $table->string('role');
            $table->string('email')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recommendations');
    }
};
