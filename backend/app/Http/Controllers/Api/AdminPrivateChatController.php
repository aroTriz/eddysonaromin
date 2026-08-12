<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesChatAttachment;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Private chat — the ADMIN side of the visitor ↔ admin DMs.
 *
 * The admin replies as the users-table account linked via `admins.user_id`
 * (seeded by AdminSeeder as "Eddyson Aromin"). All routes are guarded by the
 * /aromin admin session (same Bearer token as the rest of the admin API).
 *
 *   GET    /api/v1/admin/private/conversations
 *   GET    /api/v1/admin/private/unread
 *   GET    /api/v1/admin/private/conversations/{id}/messages?after=
 *   POST   /api/v1/admin/private/conversations/{id}/messages   { message, attachment? }
 *   POST   /api/v1/admin/private/conversations/{id}/typing     { typing: bool }   heartbeat
 *   GET    /api/v1/admin/private/conversations/{id}/typing     who is typing
 *   POST   /api/v1/admin/private/conversations/{id}/read
 *   GET    /api/v1/admin/private/conversations/{id}/stream?after=   SSE
 */
class AdminPrivateChatController extends Controller
{
    use ValidatesChatAttachment;

    private const MESSAGE_MAX = 2000;
    private const MAX_AFTER = 100;
    private const TYPING_TTL_SECONDS = 4;

    /** Private chat — the ADMIN side of the visitor ↔ admin DMs. */
    public function conversations(Request $request): JsonResponse
    {
        $admin = $this->adminFromRequest($request);
        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $sessions = DB::table('private_chat_sessions')
            ->where('user_a_id', $admin->id)
            ->orWhere('user_b_id', $admin->id)
            ->orderByDesc('updated_at')
            ->get();

        $result = [];
        foreach ($sessions as $s) {
            $conv = $this->conversationJson($s, $admin->id);
            if ($conv !== null) {
                $result[] = $conv;
            }
        }

        return response()->json(['conversations' => $result]);
    }

    /** Total unread visitor messages across all conversations (navbar badge). */
    public function unread(Request $request): JsonResponse
    {
        $admin = $this->adminFromRequest($request);
        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $total = DB::table('private_chat_messages as m')
            ->join('private_chat_sessions as s', 's.id', '=', 'm.session_id')
            ->where(fn ($q) => $q->where('s.user_a_id', $admin->id)->orWhere('s.user_b_id', $admin->id))
            ->where('m.sender_id', '!=', $admin->id)
            ->whereNull('m.read_at')
            ->count();

        return response()->json(['unread' => $total]);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        $admin = $this->adminFromRequest($request);
        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        if (! $this->sessionForAdmin($id, $admin->id)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $after = max(0, (int) $request->query('after', 0));

        $rows = DB::table('private_chat_messages')
            ->where('session_id', $id)
            ->when($after > 0, fn ($q) => $q->where('id', '>', $after)->limit(self::MAX_AFTER))
            ->unless($after > 0, fn ($q) => $q->limit(200))
            ->orderBy('id')
            ->get(['id', 'sender_id', 'message', 'attachment', 'read_at', 'created_at']);

        return response()->json([
            'messages' => $rows->map(fn ($r): array => [
                'id' => $r->id,
                'sender_id' => $r->sender_id,
                'message' => $r->message,
                'attachment' => $this->parseAttachment($r->attachment),
                'read_at' => $r->read_at,
                'created_at' => $r->created_at,
            ])->values(),
        ]);
    }

    public function send(Request $request, int $id): JsonResponse
    {
        $admin = $this->adminFromRequest($request);
        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        if (! $this->sessionForAdmin($id, $admin->id)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $message = trim((string) $request->input('message', ''));
        if (mb_strlen($message) > self::MESSAGE_MAX) {
            return response()->json(['error' => 'Invalid message.'], 422);
        }

        $attachment = $this->attachmentJson($request);

        if ($message === '' && $attachment === null) {
            return response()->json(['error' => 'Invalid message.'], 422);
        }

        $msgId = DB::table('private_chat_messages')->insertGetId([
            'session_id' => $id,
            'sender_id' => $admin->id,
            'message' => $message,
            'attachment' => $attachment,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('private_chat_sessions')->where('id', $id)->update(['updated_at' => now()]);
        DB::table('private_chat_typing')->where('conversation_id', $id)->where('user_id', $admin->id)->delete();

        $row = DB::table('private_chat_messages')->where('id', $msgId)->first();

        return response()->json([
            'message' => [
                'id' => $row->id,
                'sender_id' => $row->sender_id,
                'message' => $row->message,
                'attachment' => $this->parseAttachment($row->attachment),
                'read_at' => $row->read_at,
                'created_at' => $row->created_at,
            ],
        ], 201);
    }

    /** Typing heartbeat (admin side). */
    public function typing(Request $request, int $id): JsonResponse
    {
        $admin = $this->adminFromRequest($request);
        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        if (! $this->sessionForAdmin($id, $admin->id)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        if ($request->boolean('typing', true)) {
            DB::table('private_chat_typing')->updateOrInsert(
                ['conversation_id' => $id, 'user_id' => $admin->id],
                ['typing_until' => now()->addSeconds(self::TYPING_TTL_SECONDS), 'created_at' => now(), 'updated_at' => now()]
            );
        } else {
            DB::table('private_chat_typing')->where('conversation_id', $id)->where('user_id', $admin->id)->delete();
        }

        return response()->json(['success' => true]);
    }

    /** Who is currently typing in a conversation (admin side). */
    public function typingStatus(Request $request, int $id): JsonResponse
    {
        $admin = $this->adminFromRequest($request);
        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        if (! $this->sessionForAdmin($id, $admin->id)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return response()->json(['typing' => $this->activeTyping($id)]);
    }

    /** Mark every message from the visitor as read. */
    public function read(Request $request, int $id): JsonResponse
    {
        $admin = $this->adminFromRequest($request);
        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        if (! $this->sessionForAdmin($id, $admin->id)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        DB::table('private_chat_messages')
            ->where('session_id', $id)
            ->where('sender_id', '!=', $admin->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /** SSE live stream for one conversation (admin side). */
    public function stream(Request $request, int $id): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $admin = $this->adminFromRequest($request);
        if (! $admin || ! $this->sessionForAdmin($id, $admin->id)) {
            return response()->stream(fn () => null, 401, []);
        }

        $after = max(0, (int) $request->query('after', 0));

        return response()->stream(function () use ($after, $id): void {
            // SSE runs for as long as the client keeps the connection open —
            // don't let PHP's max_execution_time kill it after 30s, and force
            // incremental flushes so live frames aren't held in the buffer.
            set_time_limit(0);
            @ini_set('output_buffering', 'off');
            @ini_set('zlib.output_compression', 'off');
            @ini_set('implicit_flush', '1');
            $lastId = $after;
            $lastTypingKey = null;

            while (true) {
                if (connection_aborted()) {
                    break;
                }

                $rows = DB::table('private_chat_messages')
                    ->where('session_id', $id)
                    ->where('id', '>', $lastId)
                    ->orderBy('id')
                    ->limit(self::MAX_AFTER)
                    ->get(['id', 'sender_id', 'message', 'attachment', 'read_at', 'created_at']);

                foreach ($rows as $m) {
                    echo "event: message\n";
                    echo 'data: ' . json_encode([
                        'id' => $m->id,
                        'sender_id' => $m->sender_id,
                        'message' => $m->message,
                        'attachment' => $this->parseAttachment($m->attachment),
                        'read_at' => $m->read_at,
                        'created_at' => $m->created_at,
                    ]) . "\n\n";
                    $lastId = $m->id;
                }

                // Typing state — emit only when the set of typers changes.
                $typing = $this->activeTyping($id);
                $typingKey = json_encode($typing);
                if ($typingKey !== $lastTypingKey) {
                    $lastTypingKey = $typingKey;
                    echo "event: typing\n";
                    echo 'data: ' . json_encode(['users' => $typing]) . "\n\n";
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

    /**
     * Resolve the admin's private-chat user account from the /aromin
     * Bearer token (admins → admins.user_id → users).
     */
    private function adminFromRequest(Request $request): ?object
    {
        $token = $this->bearerToken($request);
        if (! $token) {
            return null;
        }

        return DB::table('admin_sessions')
            ->join('admins', 'admins.id', '=', 'admin_sessions.admin_id')
            ->join('users', 'users.id', '=', 'admins.user_id')
            ->where('admin_sessions.token', $token)
            ->where('admin_sessions.expires_at', '>', now())
            ->whereNotNull('admins.user_id')
            ->select('users.id', 'users.name', 'users.email')
            ->first();
    }

    private function sessionForAdmin(int $id, int $adminUserId): ?object
    {
        return DB::table('private_chat_sessions')
            ->where('id', $id)
            ->where(fn ($q) => $q->where('user_a_id', $adminUserId)->orWhere('user_b_id', $adminUserId))
            ->first();
    }

    /** Shape a session for the admin — visitor info + last message + unread. */
    private function conversationJson(object $session, int $adminUserId): ?array
    {
        $visitorId = $session->user_a_id == $adminUserId ? $session->user_b_id : $session->user_a_id;
        $visitor = DB::table('users')->where('id', $visitorId)->first(['id', 'name', 'email']);
        if (! $visitor) {
            return null;
        }

        $last = DB::table('private_chat_messages')
            ->where('session_id', $session->id)
            ->orderByDesc('id')
            ->first(['id', 'sender_id', 'message', 'read_at', 'created_at']);

        $unread = DB::table('private_chat_messages')
            ->where('session_id', $session->id)
            ->where('sender_id', '!=', $adminUserId)
            ->whereNull('read_at')
            ->count();

        return [
            'id' => $session->id,
            'visitor' => ['id' => $visitor->id, 'name' => $visitor->name, 'email' => $visitor->email],
            'last_message' => $last ? [
                'id' => $last->id,
                'sender_id' => $last->sender_id,
                'message' => $last->message,
                'read_at' => $last->read_at,
                'created_at' => $last->created_at,
            ] : null,
            'unread' => $unread,
            'updated_at' => $session->updated_at,
        ];
    }

    /** Currently typing participants (non-expired typing rows + names). */
    private function activeTyping(int $id): array
    {
        return DB::table('private_chat_typing as t')
            ->join('users as u', 'u.id', '=', 't.user_id')
            ->where('t.conversation_id', $id)
            ->where('t.typing_until', '>', now())
            ->select('t.user_id', 'u.name')
            ->get()
            ->map(fn ($r): array => ['id' => (int) $r->user_id, 'name' => (string) $r->name])
            ->values()
            ->all();
    }

    private function bearerToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');
        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            return $m[1];
        }

        return null;
    }
}
