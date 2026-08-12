<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Attachments for private chat — one JSON column per message:
 * { "kind": "image"|"file", "name", "size", "mime", "data" (data-URL) }.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('private_chat_messages', function (Blueprint $table) {
            $table->text('attachment')->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('private_chat_messages', function (Blueprint $table) {
            $table->dropColumn('attachment');
        });
    }
};
