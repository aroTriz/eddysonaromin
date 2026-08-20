<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Site-wide settings (key-value, `site_settings` table).
 *
 *   GET  /api/v1/settings              → public settings (no auth)
 *   GET  /api/v1/settings/pet          → public pet config (no auth)
 *   POST /api/v1/admin/settings/community-chat  body: { enabled: bool }
 *   POST /api/v1/admin/settings/backdrop  body: { enabled: bool }
 *   POST /api/v1/admin/settings/pet    body: pet config (admin only)
 *
 * Public flags:
 *  - `community_chat_enabled` — '0' rejects new chat messages (423).
 *  - `backdrop_enabled` — '0' renders PURE backgrounds (plain white in
 *    light, plain near-black in dark) — no neural-link / star animation.
 *  - `pet_settings` — JSON for the SalaryCat pet: { enabled, scale,
 *    speed, animate }. Read by the site on boot; edited from the
 *    /aromin/pet admin page.
 */
class SiteSettingsController extends Controller
{
    public const COMMUNITY_CHAT_KEY = 'community_chat_enabled';
    public const BACKDROP_KEY = 'backdrop_enabled';
    public const PET_SETTINGS_KEY = 'pet_settings';
    public const CLICK_ME_KEY = 'click_me_enabled';
    public const ASK_TRIZ_KEY = 'ask_triz_enabled';

    /** Default pet config — off until the visitor toggles it / admin enables it. */
    private const DEFAULT_PET = [
        'enabled' => false,
        'globalEnabled' => true,
        'scale' => 0.5,
        'speed' => 1,
        'animate' => true,
    ];

    /** Public settings — drives visitor-facing behavior. */
    public function show(): JsonResponse
    {
        return response()->json([
            'community_chat_enabled' => $this->communityChatEnabled(),
            'backdrop_enabled' => $this->backdropEnabled(),
            'click_me_enabled' => $this->clickMeEnabled(),
            'ask_triz_enabled' => $this->askTrizEnabled(),
            'pet' => $this->petSettings(),
        ]);
    }

    /** Public pet config — the site boots the pet with these values. */
    public function pet(): JsonResponse
    {
        return response()->json($this->petSettings());
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

    /** Turn the animated backdrops on/off. Body: { enabled: bool }. */
    public function updateBackdrop(Request $request): JsonResponse
    {
        if (app(AuthController::class)->adminFromRequest($request) === null) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $enabled = (bool) $request->input('enabled', false);
        $this->set(self::BACKDROP_KEY, $enabled ? '1' : '0');

        return response()->json(['backdrop_enabled' => $enabled]);
    }

    /** Turn the "click me..." sidebar button on/off. Body: { enabled: bool }. */
    public function updateClickMe(Request $request): JsonResponse
    {
        if (app(AuthController::class)->adminFromRequest($request) === null) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $enabled = (bool) $request->input('enabled', false);
        $this->set(self::CLICK_ME_KEY, $enabled ? '1' : '0');

        return response()->json(['click_me_enabled' => $enabled]);
    }

    /** Enable/disable the "Ask Triz.ai" sidebar button. Body: { enabled: bool }. */
    public function updateAskTriz(Request $request): JsonResponse
    {
        if (app(AuthController::class)->adminFromRequest($request) === null) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $enabled = (bool) $request->input('enabled', false);
        $this->set(self::ASK_TRIZ_KEY, $enabled ? '1' : '0');

        return response()->json(['ask_triz_enabled' => $enabled]);
    }

    /** Save the pet config. Body: { enabled, scale, speed, animate }. */
    public function updatePet(Request $request): JsonResponse
    {
        if (app(AuthController::class)->adminFromRequest($request) === null) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'globalEnabled' => ['sometimes', 'boolean'],
            'scale' => ['sometimes', Rule::in([0.35, 0.5, 0.65])],
            'speed' => ['sometimes', Rule::in([0.6, 1, 1.5])],
            'animate' => ['sometimes', 'boolean'],
        ]);

        $current = $this->petSettings();
        foreach (['enabled', 'globalEnabled', 'scale', 'speed', 'animate'] as $field) {
            if (array_key_exists($field, $validated)) {
                $current[$field] = $validated[$field];
            }
        }
        $this->set(self::PET_SETTINGS_KEY, json_encode($current));

        return response()->json($current);
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

    /** Whether the animated backdrops are on. Missing row → enabled. */
    public function backdropEnabled(): bool
    {
        $value = DB::table('site_settings')
            ->where('key', self::BACKDROP_KEY)
            ->value('value');

        return $value !== '0';
    }

    /** Whether the "click me..." sidebar button is shown. Missing row → enabled. */
    public function clickMeEnabled(): bool
    {
        $value = DB::table('site_settings')
            ->where('key', self::CLICK_ME_KEY)
            ->value('value');

        return $value !== '0';
    }

    /** Whether the "Ask Triz.ai" sidebar button is enabled. Missing row → enabled. */
    public function askTrizEnabled(): bool
    {
        $value = DB::table('site_settings')
            ->where('key', self::ASK_TRIZ_KEY)
            ->value('value');

        return $value !== '0';
    }

    /** The current pet config (JSON in site_settings, defaults when absent). */
    public function petSettings(): array
    {
        $raw = DB::table('site_settings')
            ->where('key', self::PET_SETTINGS_KEY)
            ->value('value');

        if (! $raw) {
            return self::DEFAULT_PET;
        }

        try {
            $decoded = json_decode((string) $raw, true);

            return array_merge(self::DEFAULT_PET, is_array($decoded) ? $decoded : []);
        } catch (\Throwable) {
            return self::DEFAULT_PET;
        }
    }

    private function set(string $key, string $value): void
    {
        DB::table('site_settings')->updateOrInsert(
            ['key' => $key],
            ['value' => $value, 'created_at' => now(), 'updated_at' => now()],
        );
    }
}
