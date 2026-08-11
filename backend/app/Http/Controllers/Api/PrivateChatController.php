<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Private chat — 1-on-1 DMs between registered users.
 *
 * Auth (email + password → bearer token, SHA-256 hash like the `admins` table
 * so the Cloudflare Pages Functions mirror can verify with WebCrypto alone):
 *   POST /api/v1/private/auth/register  { name, email, password, password_confirmation }
 *   POST /api/v1/private/auth/login     { email, password }
 *   POST /api/v1/private/auth/logout
 *   GET  /api/v1/private/auth/session
 *
 * Chat (all authenticated):
 *   GET    /api/v1/private/users?q=                     search other users
 *   GET    /api/v1/private/conversations                my conversations
 *   POST   /api/v1/private/conversations  { user_id }   start / resume a DM
 *   GET    /api/v1/private/conversations/{id}/messages?after=
 *   POST   /api/v1/private/conversations/{id}/messages  { message }
 *   POST   /api/v1/private/conversations/{id}/read      mark incoming as read
 *   GET    /api/v1/private/conversations/{id}/stream?after=   SSE live stream
 */
class PrivateChatController extends Controller
{
    private const NAME_MAX = 40;
    private const MESSAGE_MAX = 2000;
    private const SESSION_TTL_MINUTES = 60 * 24 * 7; // 7 days
    private const MAX_AFTER = 100;

    /** Profanity (substring) — same spirit as the community chat filter. */
    private const BAD_LOOSE = [
        'fuck', 'motherfuck', 'shit', 'bullshit', 'bitch', 'asshole', 'cunt',
        'faggot', 'nigger', 'nigga', 'dickhead', 'jackass', 'dumbass',
        'cocksuck', 'dipshit', 'putangina', 'putanginamo', 'tangina', 'taena',
        'tarantado', 'gago', 'gaga', 'ulol', 'kingina', 'kupal', 'pakshet',
        'pakyu', 'hinayupak', 'hindot', 'hindut', 'buwiset', 'bwisit',
        'putang ina', 'tang ina', 'walang hiya', 'hayop ka', 'gunggong',
    ];

    private const BAD_STRICT = [
        'ass', 'dick', 'cock', 'prick', 'slut', 'whore', 'twat', 'wank',
        'piss', 'bastard', 'pussy', 'puta', 'tanga', 'bobo', 'tite', 'titi',
        'puki', 'pekpek', 'jakol', 'leche', 'peste', 'lintik', 'ungas', 'inutil',
    ];

    // ── Auth ─────────────────────────────────────────────────────────────

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:40'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $id = DB::table('users')->insertGetId([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'password' => hash('sha256', $validated['password']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'token' => $this->issueToken($id),
            'user' => $this->publicUser($id),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = DB::table('users')
            ->where('email', strtolower(trim($validated['email'])))
            ->first();

        if (! $user || ! hash_equals((string) $user->password, hash('sha256', $validated['password']))) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        return response()->json([
            'success' => true,
            'token' => $this->issueToken($user->id),
            'user' => $this->publicUser($user->id),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $this->bearerToken($request);
        if ($token) {
            DB::table('private_chat_tokens')->where('token', $token)->delete();
        }

        return response()->json(['success' => true]);
    }

    public function session(Request $request): JsonResponse
    {
        $user = $this->userFromRequest($request);

        if (! $user) {
            return response()->json(['authenticated' => false], 401);
        }

        return response()->json([
            'authenticated' => true,
            'user' => $this->publicUser($user->id),
        ]);
    }

    // ── Chat (visitor ↔ admin) ─────────────────────────────────────────

    /**
     * The admin's private-chat account — visitors DM this user.
     *   GET /api/v1/private/admin → { admin: { id, name } }
     */
    public function admin(): JsonResponse
    {
        $admin = $this->adminUser();

        if (! $admin) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return response()->json([
            'admin' => ['id' => $admin->id, 'name' => $admin->name],
        ]);
    }

    /**
     * Find (or create) the visitor's 1-on-1 conversation with the admin.
     *   POST /api/v1/private/conversations → { conversation }
     */
    public function start(Request $request): JsonResponse
    {
        $user = $this->userFromRequest($request);
        if (! $user) {
            return $this->unauthorized();
        }

        $admin = $this->adminUser();
        if (! $admin) {
            return response()->json(['error' => 'Not found'], 404);
        }
        if ($admin->id === $user->id) {
            return response()->json(['error' => 'Invalid user'], 422);
        }

        [$a, $b] = $admin->id < $user->id ? [$admin->id, $user->id] : [$user->id, $admin->id];

        $session = DB::table('private_chat_sessions')
            ->where('user_a_id', $a)
            ->where('user_b_id', $b)
            ->first();

        if (! $session) {
            $id = DB::table('private_chat_sessions')->insertGetId([
                'user_a_id' => $a,
                'user_b_id' => $b,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $session = DB::table('private_chat_sessions')->where('id', $id)->first();
        }

        return response()->json(['conversation' => $this->conversationJson($session, $user->id)]);
    }

    // ── Messages ─────────────────────────────────────────────────────────

    /** Messages for a conversation (participant-only). `?after=` polls newer. */
    public function messages(Request $request, int $id): JsonResponse
    {
        $user = $this->userFromRequest($request);
        if (! $user) {
            return $this->unauthorized();
        }
        if (! $this->sessionForUser($id, $user->id)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $after = max(0, (int) $request->query('after', 0));

        $rows = DB::table('private_chat_messages')
            ->where('session_id', $id)
            ->when($after > 0, fn ($q) => $q->where('id', '>', $after)->limit(self::MAX_AFTER))
            ->unless($after > 0, fn ($q) => $q->limit(200))
            ->orderBy('id')
            ->get(['id', 'sender_id', 'message', 'created_at']);

        return response()->json([
            'messages' => $rows->map(fn ($r): array => [
                'id' => $r->id,
                'sender_id' => $r->sender_id,
                'message' => $r->message,
                'created_at' => $r->created_at,
            ])->values(),
        ]);
    }

    public function send(Request $request, int $id): JsonResponse
    {
        $user = $this->userFromRequest($request);
        if (! $user) {
            return $this->unauthorized();
        }
        if (! $this->sessionForUser($id, $user->id)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $message = trim((string) $request->input('message', ''));
        if ($message === '' || mb_strlen($message) > self::MESSAGE_MAX) {
            return response()->json(['error' => 'Invalid message.'], 422);
        }
        if ($this->isOffensive($message)) {
            return response()->json(['reason' => 'blocked'], 422);
        }

        $msgId = DB::table('private_chat_messages')->insertGetId([
            'session_id' => $id,
            'sender_id' => $user->id,
            'message' => $message,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Bump the session so it floats to the top of the conversation list.
        DB::table('private_chat_sessions')->where('id', $id)->update(['updated_at' => now()]);

        $row = DB::table('private_chat_messages')->where('id', $msgId)->first();

        return response()->json([
            'message' => [
                'id' => $row->id,
                'sender_id' => $row->sender_id,
                'message' => $row->message,
                'created_at' => $row->created_at,
            ],
        ], 201);
    }

    /** Mark every message from the other participant as read. */
    public function read(Request $request, int $id): JsonResponse
    {
        $user = $this->userFromRequest($request);
        if (! $user) {
            return $this->unauthorized();
        }
        if (! $this->sessionForUser($id, $user->id)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        DB::table('private_chat_messages')
            ->where('session_id', $id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * Live stream — Server-Sent Events for one conversation.
     *   GET /api/v1/private/conversations/{id}/stream?after={lastId}
     * Client keeps its 8s poll as a fallback if the stream drops.
     */
    public function stream(Request $request, int $id): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $user = $this->userFromRequest($request);
        if (! $user || ! $this->sessionForUser($id, $user->id)) {
            return response()->stream(fn () => null, 401, []);
        }

        $after = max(0, (int) $request->query('after', 0));

        return response()->stream(function () use ($after, $id): void {
            $lastId = $after;

            while (true) {
                if (connection_aborted()) {
                    break;
                }

                $rows = DB::table('private_chat_messages')
                    ->where('session_id', $id)
                    ->where('id', '>', $lastId)
                    ->orderBy('id')
                    ->limit(self::MAX_AFTER)
                    ->get(['id', 'sender_id', 'message', 'created_at']);

                foreach ($rows as $m) {
                    echo "event: message\n";
                    echo 'data: ' . json_encode([
                        'id' => $m->id,
                        'sender_id' => $m->sender_id,
                        'message' => $m->message,
                        'created_at' => $m->created_at,
                    ]) . "\n\n";
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

    // ── Helpers ──────────────────────────────────────────────────────────

    /** Issue a fresh 7-day bearer token for a user. */
    private function issueToken(int $userId): string
    {
        $token = bin2hex(random_bytes(32));

        DB::table('private_chat_tokens')->insert([
            'user_id' => $userId,
            'token' => $token,
            'expires_at' => now()->addMinutes(self::SESSION_TTL_MINUTES),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $token;
    }

    /** Resolve the user behind a Bearer token, or null when invalid/expired. */
    public function userFromRequest(Request $request): ?object
    {
        $token = $this->bearerToken($request);
        if (! $token) {
            return null;
        }

        return DB::table('private_chat_tokens')
            ->join('users', 'users.id', '=', 'private_chat_tokens.user_id')
            ->where('private_chat_tokens.token', $token)
            ->where('private_chat_tokens.expires_at', '>', now())
            ->select('users.id', 'users.name', 'users.email')
            ->first();
    }

    /** The users-table account the admin replies from (via admins.user_id). */
    public function adminUser(): ?object
    {
        return DB::table('admins')
            ->join('users', 'users.id', '=', 'admins.user_id')
            ->whereNotNull('admins.user_id')
            ->select('users.id', 'users.name', 'users.email')
            ->first();
    }

    /** A session only if the user is one of its two participants. */
    private function sessionForUser(int $id, int $userId): ?object
    {
        return DB::table('private_chat_sessions')
            ->where('id', $id)
            ->where(fn ($q) => $q->where('user_a_id', $userId)->orWhere('user_b_id', $userId))
            ->first();
    }

    /** Shape a session as the frontend expects it. Null when the peer is gone. */
    private function conversationJson(object $session, int $userId): ?array
    {
        $otherId = $session->user_a_id == $userId ? $session->user_b_id : $session->user_a_id;
        $other = DB::table('users')->where('id', $otherId)->first(['id', 'name']);
        if (! $other) {
            return null;
        }

        $last = DB::table('private_chat_messages')
            ->where('session_id', $session->id)
            ->orderByDesc('id')
            ->first(['id', 'sender_id', 'message', 'created_at']);

        $unread = DB::table('private_chat_messages')
            ->where('session_id', $session->id)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->count();

        return [
            'id' => $session->id,
            'user' => ['id' => $other->id, 'name' => $other->name],
            'last_message' => $last ? [
                'id' => $last->id,
                'sender_id' => $last->sender_id,
                'message' => $last->message,
                'created_at' => $last->created_at,
            ] : null,
            'unread' => $unread,
            'updated_at' => $session->updated_at,
        ];
    }

    private function publicUser(int $id): array
    {
        $u = DB::table('users')->where('id', $id)->first(['id', 'name', 'email']);

        return ['id' => $u->id, 'name' => $u->name, 'email' => $u->email];
    }

    private function bearerToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');
        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            return $m[1];
        }

        return null;
    }

    private function isOffensive(string $text): bool
    {
        $t = mb_strtolower($text);
        foreach (self::BAD_LOOSE as $w) {
            if (str_contains($t, $w)) {
                return true;
            }
        }
        foreach (self::BAD_STRICT as $w) {
            if (preg_match('/\b' . preg_quote($w, '/') . '\b/u', $t)) {
                return true;
            }
        }

        return false;
    }

    private function unauthorized(): JsonResponse
    {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
}
