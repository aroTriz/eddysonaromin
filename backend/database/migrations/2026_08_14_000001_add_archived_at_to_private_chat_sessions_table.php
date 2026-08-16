<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds `archived_at` to private_chat_sessions — the admin can archive a
 * conversation (hides it from the active thread list; restorable from the
 * /aromin private-chat area). Any new message — from either participant —
 * clears the flag so an archived thread that gets activity is never hidden.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('private_chat_sessions', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('private_chat_sessions', function (Blueprint $table) {
            $table->dropColumn('archived_at');
        });
    }
};
