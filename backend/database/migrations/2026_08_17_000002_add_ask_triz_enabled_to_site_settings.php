<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add the ask_triz_enabled setting to site_settings.
 *
 * When '1' (default), the sidebar shows "Ask Triz.ai" and the AI chat is active.
 * When '0', the sidebar shows "Eddyson Disabled Trizai" and the chat is disabled.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->updateOrInsert(
            ['key' => 'ask_triz_enabled'],
            ['value' => '1', 'created_at' => now(), 'updated_at' => now()],
        );
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'ask_triz_enabled')->delete();
    }
};
