<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds recommendation letter image to recommendations CMS — similar to
 * experience albums/certificates. Stores base64 data-URL or path.
 * Nullable, displays as filled image with image-icon trigger (like experience).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recommendations', function (Blueprint $table) {
            $table->text('letter_url')->nullable()->after('photo_url');
        });
    }

    public function down(): void
    {
        Schema::table('recommendations', function (Blueprint $table) {
            $table->dropColumn('letter_url');
        });
    }
};
