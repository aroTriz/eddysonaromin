<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Certifications CMS — credentials & degrees, managed from /aromin.
 * Mirrors the static certifications array that used to live in frontend/src/data/profile.ts.
 * Transferred to DB so edits via CMS reflect live (hosted + local).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certifications', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('issuer');
            $table->string('year', 16);
            $table->string('category', 32)->default('certification'); // degree | certification
            $table->text('summary')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certifications');
    }
};
