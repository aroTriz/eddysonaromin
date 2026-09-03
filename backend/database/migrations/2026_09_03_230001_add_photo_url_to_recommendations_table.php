<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds profile photo support to recommendations CMS.
 * Same pattern as references: photo_url stores public path or base64 data-URL.
 * If null, UI falls back to auto-generated initials.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recommendations', function (Blueprint $table) {
            $table->string('photo_url')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('recommendations', function (Blueprint $table) {
            $table->dropColumn('photo_url');
        });
    }
};
