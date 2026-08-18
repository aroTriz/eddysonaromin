<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add the click_me_enabled setting to site_settings.
 *
 * When '1' (default), the sidebar shows the "click me..." button that
 * opens the Ask Triz.ai overlay. When '0', the button is hidden.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')->updateOrInsert(
            ['key' => 'click_me_enabled'],
            ['value' => '1', 'created_at' => now(), 'updated_at' => now()],
        );
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'click_me_enabled')->delete();
    }
};
