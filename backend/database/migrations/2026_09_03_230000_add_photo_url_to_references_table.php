<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds profile photo support to references CMS.
 * Stores either a public path (/images/logos/...) or a base64 data-URL.
 * PRAXXYS references will use its experience logo (/images/logos/praxxys-logo.png).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('references', function (Blueprint $table) {
            $table->string('photo_url')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('references', function (Blueprint $table) {
            $table->dropColumn('photo_url');
        });
    }
};
