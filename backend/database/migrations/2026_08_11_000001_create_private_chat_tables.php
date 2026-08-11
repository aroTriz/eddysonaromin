<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Private chat (1-on-1 DMs) — bearer tokens, conversations and messages.
     * Users live in the default `users` table (email + SHA-256 password hash,
     * mirroring the `admins` pattern so the Cloudflare Functions mirror can
     * verify with WebCrypto alone).
     */
    public function up(): void
    {
        Schema::create('private_chat_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('token');
        });

        Schema::create('private_chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_a_id');
            $table->unsignedBigInteger('user_b_id');
            $table->timestamps();

            $table->foreign('user_a_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('user_b_id')->references('id')->on('users')->cascadeOnDelete();
            // One row per pair — normalized so user_a_id < user_b_id.
            $table->unique(['user_a_id', 'user_b_id']);
        });

        Schema::create('private_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('private_chat_sessions')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('message', 2000);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['session_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('private_chat_messages');
        Schema::dropIfExists('private_chat_sessions');
        Schema::dropIfExists('private_chat_tokens');
    }
};
