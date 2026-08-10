<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Community chat moderation fields — IP capture, archiving, and the
 * "delete after 72 hours" scheduled deletion toggle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->string('ip', 45)->nullable()->after('device');
            $table->timestamp('archived_at')->nullable()->after('ip');
            $table->timestamp('delete_at')->nullable()->after('archived_at');
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['delete_at', 'archived_at', 'ip']);
        });
    }
};
