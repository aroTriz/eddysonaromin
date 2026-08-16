<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Account blacklist — `banned_at` on users.
 *
 * Null = active account. Non-null = blacklisted: the account is locked out
 * of private chat (login + send/start rejected). Bans are set two ways:
 *   - automatically, when the account sends vulgar language in private chat;
 *   - manually, from the /aromin accounts page (and removed there too).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('banned_at')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('banned_at');
        });
    }
};
