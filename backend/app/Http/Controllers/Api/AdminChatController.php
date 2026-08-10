<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Community chat moderation for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/chat/messages                  list (?archived=1)
 *   DELETE /api/v1/admin/chat/messages/bulk             bulk delete (ids)
 *   POST   /api/v1/admin/chat/messages/bulk/delete-after bulk 72h toggle
 *   POST   /api/v1/admin/chat/messages/{id}/archive     archive
 *   POST   /api/v1/admin/chat/messages/{id}/restore     restore
 *   POST   /api/v1/admin/chat/messages/{id}/delete-after toggle 72h
 *   DELETE /api/v1/admin/chat/messages/{id}             delete
 */
class AdminChatController extends Controller
{
    private const DELETE_AFTER_HOURS = 72;

    /** List chat messages (newest first). `?archived=1` lists archived ones. */
    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Lazy purge — scheduled deletions that have passed are removed now.
        app(ChatController::class)->purgeExpired();

        $messages = DB::table('chat_messages')
            ->when(
                $request->boolean('archived'),
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->orderByDesc('id')
            ->get([
                'id', 'name', 'message', 'ip', 'location', 'device',
                'created_at', 'archived_at', 'delete_at',
            ]);

        return response()->json(['data' => $messages]);
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        DB::table('chat_messages')->where('id', $id)->update([
            'archived_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        DB::table('chat_messages')->where('id', $id)->update([
            'archived_at' => null,
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        DB::table('chat_messages')->where('id', $id)->delete();

        return response()->json(['success' => true]);
    }

    /** Bulk permanent delete. */
    public function bulkDestroy(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $ids = $this->ids($request);

        if ($ids !== []) {
            DB::table('chat_messages')->whereIn('id', $ids)->delete();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Toggle the "delete after 72 hours" schedule for one message.
     * Body: { enabled: bool } — tick = delete_at in 72h, untick = reset.
     */
    public function scheduledDelete(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $enabled = (bool) $request->input('enabled', false);

        DB::table('chat_messages')->where('id', $id)->update([
            'delete_at' => $enabled ? now()->addHours(self::DELETE_AFTER_HOURS) : null,
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    /** Bulk 72h toggle — body: { ids: [], enabled: bool }. */
    public function bulkScheduledDelete(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $ids = $this->ids($request);
        $enabled = (bool) $request->input('enabled', false);

        if ($ids !== []) {
            DB::table('chat_messages')->whereIn('id', $ids)->update([
                'delete_at' => $enabled ? now()->addHours(self::DELETE_AFTER_HOURS) : null,
                'updated_at' => now(),
            ]);
        }

        return response()->json(['success' => true]);
    }

    /** Parse the ids array from the request body. */
    private function ids(Request $request): array
    {
        $raw = $request->input('ids');
        if (! is_array($raw)) {
            return [];
        }

        return array_values(array_filter(array_map('intval', $raw)));
    }

    private function guard(Request $request): bool
    {
        return app(AuthController::class)->adminFromRequest($request) !== null;
    }
}
