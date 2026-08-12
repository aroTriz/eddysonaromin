<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visit analytics — one row per page view.
 * Powers the /aromin dashboard (trends, map heat, devices, top pages).
 * Unique visitors are derived from COUNT(DISTINCT ip), never from this count.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->string('site', 32)->default('portfolio');
            $table->string('ip', 45)->nullable();            // admin-only; masked in the UI
            $table->string('country', 2)->nullable();        // ISO 3166-1 alpha-2
            $table->string('country_name', 80)->nullable();
            $table->string('region', 80)->nullable();
            $table->string('city', 80)->nullable();
            $table->decimal('lat', 10, 6)->nullable();
            $table->decimal('lon', 10, 6)->nullable();
            $table->string('path', 255)->nullable();
            $table->string('referrer', 500)->nullable();
            $table->string('device', 40)->nullable();
            $table->string('browser', 40)->nullable();
            $table->string('os', 40)->nullable();
            $table->timestamps();

            $table->index(['site', 'created_at']);
            $table->index('ip');
            $table->index(['site', 'country']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
