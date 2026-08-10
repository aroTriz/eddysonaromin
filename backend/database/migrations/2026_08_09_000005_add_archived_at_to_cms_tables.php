<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds `archived_at` to the three CMS tables — archived rows are hidden
 * from the public site and the active admin lists, but can be restored
 * from the /aromin admin area.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('updated_at');
        });
        Schema::table('stack_groups', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('updated_at');
        });
        Schema::table('recommendations', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropColumn('archived_at');
        });
        Schema::table('stack_groups', function (Blueprint $table) {
            $table->dropColumn('archived_at');
        });
        Schema::table('recommendations', function (Blueprint $table) {
            $table->dropColumn('archived_at');
        });
    }
};
