<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Community chat — message wall + remembered identities.
     */
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name', 40);
            $table->string('message', 500);
            $table->string('client_id', 64)->nullable()->index();
            $table->string('location', 120)->nullable();
            $table->string('device', 40)->nullable();
            $table->timestamps();
        });

        Schema::create('chat_identities', function (Blueprint $table) {
            $table->string('client_id', 64)->primary();
            $table->string('name', 40);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_identities');
        Schema::dropIfExists('chat_messages');
    }
};
