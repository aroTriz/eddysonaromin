<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Site-wide settings (key-value, `site_settings` table).
 *
 *   GET  /api/v1/settings                    → public settings (no auth)
 *   POST /api/v1/admin/settings/community-chat  body: { enabled: bool }
 *
 * Currently exposes a single flag: `community_chat_enabled`. When '0' the
 * community chat rejects new messages (reason: 'disabled', 423) and the
 * frontend overlay shows "community chat has been turned off".
 */
class SiteSettingsController extends Controller
{
    public const COMMUNITY_CHAT_KEY = 'community_chat_enabled';

    /** Public settings — drives visitor-facing behavior. */
    public function show(): JsonResponse
    {
        return response()->json([
            'community_chat_enabled' => $this->communityChatEnabled(),
        ]);
    }

    /** Turn the community chat on/off. Body: { enabled: bool }. */
    public function updateCommunityChat(Request $request): JsonResponse
    {
        if (app(AuthController::class)->adminFromRequest($request) === null) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $enabled = (bool) $request->input('enabled', false);
        $this->set(self::COMMUNITY_CHAT_KEY, $enabled ? '1' : '0');

        return response()->json(['community_chat_enabled' => $enabled]);
    }

    /** Whether the community chat currently accepts new messages. */
    public function communityChatEnabled(): bool
    {
        $value = DB::table('site_settings')
            ->where('key', self::COMMUNITY_CHAT_KEY)
            ->value('value');

        // Missing row → enabled (fail-open: a settings hiccup never
        // silently locks the chat).
        return $value !== '0';
    }

    private function set(string $key, string $value): void
    {
        DB::table('site_settings')->updateOrInsert(
            ['key' => $key],
            ['value' => $value, 'created_at' => now(), 'updated_at' => now()],
        );
    }
}
