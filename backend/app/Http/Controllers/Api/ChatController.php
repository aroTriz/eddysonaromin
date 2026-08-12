<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Community chat — public message wall with remembered identities
 * (mirrors the bryllim.com community chat). The frontend does the heavy
 * filtering; these endpoints enforce a server-side backstop (length,
 * links, cooldown) and persist messages/identities.
 */
class ChatController extends Controller
{
    private const NAME_MAX = 40;
    private const MESSAGE_MAX = 500;
    private const COOLDOWN_MS = 8000;
    private const MAX_AFTER = 60;

    /** Censored words loaded once per request from the `censored_words` table. */
    private static ?array $words = null;

    private const LINK_TLDS = [
        'com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'info',
        'biz', 'link', 'site', 'online', 'store', 'shop', 'page', 'live',
        'tech', 'cloud', 'click', 'me', 'ly', 'gg', 'gl', 'be', 'to', 'tv',
        'fm', 'sh', 'cc', 'ws', 'ph', 'uk', 'ca', 'au', 'de', 'jp', 'eu',
        'edu', 'gov', 'top', 'vip', 'pro', 'fun', 'icu',
    ];

    /** Recent messages. `?after=` returns only messages newer than that id. */
    public function index(Request $request): JsonResponse
    {
        $after = max(0, (int) $request->query('after', 0));

        // Lazy purge — any message past its scheduled delete_at is removed now.
        $this->purgeExpired();

        $messages = DB::table('chat_messages')
            ->whereNull('archived_at')
            ->orderBy('id')
            ->when($after > 0, fn ($q) => $q->where('id', '>', $after)->limit(self::MAX_AFTER))
            ->unless($after > 0, fn ($q) => $q->limit(100))
            ->get(['id', 'name', 'message', 'device', 'created_at']);

        $total = DB::table('chat_messages')->whereNull('archived_at')->count();

        return response()->json([
            'messages' => $messages,
            'total' => $total,
        ]);
    }

    /** Post a chat message. */
    public function store(Request $request): JsonResponse
    {
        $name = trim((string) $request->input('name', ''));
        $message = trim((string) $request->input('message', ''));
        $clientId = substr((string) $request->input('client_id', ''), 0, 64);
        $location = substr((string) $request->input('location', ''), 0, 120);
        $device = substr((string) $request->input('device', ''), 0, 40);
        // Real public IP (sent by the client from ipwho.is); fall back to the
        // request IP when absent.
        $ip = substr(trim((string) $request->input('ip', '')), 0, 45);
        if ($ip === '') {
            $ip = (string) $request->ip();
        }

        if ($name === '' || mb_strlen($name) > self::NAME_MAX) {
            return response()->json(['error' => 'Invalid name.'], 422);
        }
        if ($message === '' || mb_strlen($message) > self::MESSAGE_MAX) {
            return response()->json(['error' => 'Invalid message.'], 422);
        }
        if ($this->containsLink($name) || $this->containsLink($message)) {
            return response()->json(['reason' => 'link'], 422);
        }
        // Offensive names AND messages are rejected outright (mirrors the
        // Cloudflare Pages Functions build) — a profane message is never
        // stored, never displayed, never counted. Censoring-in-place used to
        // post masked words that still showed up in the wall and the total.
        if ($this->isOffensive($name) || $this->isOffensive($message)) {
            return response()->json(['reason' => 'blocked'], 422);
        }

        // Per-client cooldown — one message every 8s.
        if ($clientId !== '') {
            $last = DB::table('chat_messages')
                ->where('client_id', $clientId)
                ->orderByDesc('id')
                ->value('created_at');

            if ($last && strtotime($last) > (time() - self::COOLDOWN_MS / 1000)) {
                return response()->json(['reason' => 'cooldown'], 429);
            }
        }

        $id = DB::table('chat_messages')->insertGetId([
            'name' => $name,
            'message' => $message,
            'client_id' => $clientId !== '' ? $clientId : null,
            'location' => $location !== '' ? $location : null,
            'device' => $device !== '' ? $device : null,
            'ip' => $ip !== '' ? $ip : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = DB::table('chat_messages')->where('id', $id)->first([
            'id', 'name', 'message', 'device', 'created_at',
        ]);

        return response()->json(['message' => $row], 201);
    }

    /** Remembered name for a returning visitor. */
    public function identityGet(Request $request): JsonResponse
    {
        $clientId = substr((string) $request->query('client_id', ''), 0, 64);
        if ($clientId === '') {
            return response()->json(['name' => null]);
        }

        $name = DB::table('chat_identities')->where('client_id', $clientId)->value('name');

        return response()->json(['name' => $name]);
    }

    /** Save the visitor's chosen chat name. */
    public function identityPost(Request $request): JsonResponse
    {
        $clientId = substr((string) $request->input('client_id', ''), 0, 64);
        $name = trim((string) $request->input('name', ''));

        if ($clientId === '' || $name === '' || mb_strlen($name) > self::NAME_MAX) {
            return response()->json(['error' => 'Invalid identity.'], 422);
        }
        if ($this->containsLink($name) || $this->isOffensive($name)) {
            return response()->json(['reason' => 'blocked'], 422);
        }

        DB::table('chat_identities')->updateOrInsert(
            ['client_id' => $clientId],
            ['name' => $name, 'created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['name' => $name]);
    }

    /**
     * Live stream — Server-Sent Events. Pushes new messages as they arrive.
     *   GET /api/v1/chat/stream?after={lastId}
     * Falls back to the client's 8s poll automatically if the stream dies.
     */
    public function stream(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $after = max(0, (int) $request->query('after', 0));

        return response()->stream(function () use ($after) {
            // SSE runs for as long as the client keeps the connection open —
            // don't let PHP's max_execution_time kill it after 30s.
            set_time_limit(0);
            $lastId = $after;

            while (true) {
                if (connection_aborted()) {
                    break;
                }

                // Lazy purge — scheduled deletions that have passed are removed.
                $this->purgeExpired();

                $messages = DB::table('chat_messages')
                    ->whereNull('archived_at')
                    ->where('id', '>', $lastId)
                    ->orderBy('id')
                    ->limit(100)
                    ->get(['id', 'name', 'message', 'device', 'created_at']);

                foreach ($messages as $m) {
                    echo "event: message\n";
                    // DB::table() rows are stdClass — json_encode, not ->toJson().
                    echo 'data: ' . json_encode($m) . "\n\n";
                    $lastId = $m->id;
                }

                echo ": keepalive\n\n";
                ob_flush();
                flush();

                sleep(1);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    /** Remove any message whose scheduled delete_at has passed (lazy purge). */
    public function purgeExpired(): void
    {
        DB::table('chat_messages')
            ->whereNotNull('delete_at')
            ->where('delete_at', '<=', now())
            ->delete();
    }

    private function containsLink(string $text): bool
    {
        $t = mb_strtolower($text);
        if (str_contains($t, 'http://') || str_contains($t, 'https://')) {
            return true;
        }
        if (preg_match('/(?:^|[^a-z0-9])www\.[a-z0-9]/', $t)) {
            return true;
        }
        $tlds = implode('|', array_map('preg_quote', self::LINK_TLDS));
        return (bool) preg_match("/[a-z0-9][a-z0-9-]*\.(?:{$tlds})\b/", $t);
    }

    /** Censored words from the DB, split into loose (substring) + strict (whole word). */
    private function words(): array
    {
        if (self::$words === null) {
            $loose = [];
            $strict = [];
            foreach (DB::table('censored_words')->get(['word', 'kind']) as $row) {
                $w = mb_strtolower(trim((string) $row->word));
                if ($w === '') {
                    continue;
                }
                if ($row->kind === 'strict') {
                    $strict[] = $w;
                } else {
                    $loose[] = $w;
                }
            }
            // Longest first so "motherfuck" masks before "fuck" inside it.
            usort($loose, fn (string $a, string $b) => mb_strlen($b) <=> mb_strlen($a));
            usort($strict, fn (string $a, string $b) => mb_strlen($b) <=> mb_strlen($a));
            self::$words = ['loose' => $loose, 'strict' => $strict];
        }

        return self::$words;
    }

    private function isOffensive(string $text): bool
    {
        $t = mb_strtolower($text);
        $words = $this->words();
        foreach ($words['loose'] as $w) {
            if (str_contains($t, $w)) {
                return true;
            }
        }
        foreach ($words['strict'] as $w) {
            if (preg_match('/\b' . preg_quote($w, '/') . '\b/u', $t)) {
                return true;
            }
        }
        return false;
    }
}
