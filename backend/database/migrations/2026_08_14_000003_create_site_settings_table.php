<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Site settings (key-value) — toggles that change visitor-facing behavior.
 *
 *   community_chat_enabled = '1' (default) | '0'
 *     Toggled from the /aromin preferences page. When '0', the community
 *     chat rejects new messages (reason: 'disabled') and the frontend
 *     overlay shows a "community chat has been turned off" notice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('value');
            $table->timestamps();
        });

        DB::table('site_settings')->insert([
            'key' => 'community_chat_enabled',
            'value' => '1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
