<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Is typing" heartbeats for private chat — one row per participant per
 * conversation; the stream checks typing_until to emit typing events.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('private_chat_typing', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('conversation_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamp('typing_until')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('private_chat_typing');
    }
};
