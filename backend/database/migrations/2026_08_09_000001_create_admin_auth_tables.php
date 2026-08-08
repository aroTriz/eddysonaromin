<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin authentication + visitor tracking tables.
 * Mirrors the previous projects' pattern (SHA-256 password, 6-digit OTP,
 * session tokens) so the /aromin admin area behaves identically.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('admins', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('password_hash');
            $table->string('email');
            $table->timestamps();
        });

        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained()->cascadeOnDelete();
            $table->string('code', 6);
            $table->timestamp('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamps();

            $table->index(['admin_id', 'used']);
        });

        Schema::create('admin_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('token');
        });

        Schema::create('visitors', function (Blueprint $table) {
            $table->id();
            $table->string('site')->default('portfolio');
            $table->unsignedBigInteger('count')->default(0);
            $table->timestamps();

            $table->unique('site');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visitors');
        Schema::dropIfExists('admin_sessions');
        Schema::dropIfExists('otp_codes');
        Schema::dropIfExists('admins');
    }
};
