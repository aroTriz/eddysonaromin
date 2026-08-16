<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CMS support for projects:
 *  - `archived_at` — hides a project from the public site + active admin
 *    lists, restorable from the /aromin admin area (same pattern as the
 *    blog posts / recommendations).
 *  - `showcase` — JSON device-screenshot config for the project detail
 *    page: which laptop and phone screens to render in the DeviceShowcase.
 *    Existing rows keep their current `image_url` behaviour (no showcase →
 *    fallback), so this is purely additive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('updated_at');
            $table->json('showcase')->nullable()->after('archived_at');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['archived_at', 'showcase']);
        });
    }
};
