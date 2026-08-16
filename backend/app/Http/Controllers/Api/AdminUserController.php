<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Account management for the /aromin admin area (authenticated).
 *
 * Manages the registered site accounts (the `users` table — private chat
 * register/login accounts). Passwords are stored as one-way SHA-256 hashes
 * (same scheme as the public register + Cloudflare mirror), so the admin can
 * see the hash and reset a password, but the original plaintext is never
 * recoverable.
 *
 *   GET    /api/v1/admin/users       → all accounts
 *   POST   /api/v1/admin/users       → create an account
 *   PUT    /api/v1/admin/users/{id}  → edit an account (optional password reset)
 *   DELETE /api/v1/admin/users/{id}  → delete an account
 *   DELETE /api/v1/admin/users/bulk  → bulk delete (ids array)
 *   POST   /api/v1/admin/users/{id}/ban   → blacklist an account
 *   POST   /api/v1/admin/users/{id}/unban → remove from the blacklist
 *
 * Banned accounts (users.banned_at) are locked out of private chat — set
 * automatically when they send vulgar language, or manually from here.
 *
 * The users row linked to an admin (admins.user_id — the admin's private-chat
 * persona) cannot be deleted; it is the account visitors DM.
 */
class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Admin accounts live in their own table (admins) — never here. Their
        // private-chat persona rows (admins.user_id → users) are excluded so
        // this page lists ONLY the web chat accounts.
        $adminUserIds = DB::table('admins')
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->all();

        $conversationCounts = DB::table('private_chat_sessions')
            ->selectRaw('user_a_id as user_id, count(*) as c')
            ->groupBy('user_a_id')
            ->union(
                DB::table('private_chat_sessions')
                    ->selectRaw('user_b_id as user_id, count(*) as c')
                    ->groupBy('user_b_id')
            )
            ->get()
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->sum('c'));

        $users = DB::table('users')
            ->whereNotIn('id', $adminUserIds)
            ->orderBy('id')
            ->get()
            ->map(function ($u) use ($conversationCounts) {
                return [
                    'id' => (int) $u->id,
                    'name' => (string) $u->name,
                    'email' => (string) $u->email,
                    'password' => (string) $u->password,
                    'is_admin' => false, // admin accounts are never listed here
                    'banned_at' => $u->banned_at ?? null,
                    'conversations' => (int) ($conversationCounts->get($u->id) ?? 0),
                    'created_at' => (string) ($u->created_at ?? ''),
                ];
            })
            ->all();

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:40'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $id = DB::table('users')->insertGetId([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'password' => hash('sha256', $validated['password']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => $this->row($id)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $user = DB::table('users')->where('id', $id)->first();
        if (! $user) {
            return response()->json(['error' => 'Account not found.'], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:40'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', 'unique:users,email,'.$id],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $data = [
            'name' => isset($validated['name']) ? trim($validated['name']) : $user->name,
            'email' => isset($validated['email']) ? strtolower(trim($validated['email'])) : $user->email,
            'updated_at' => now(),
        ];

        // Blank/null password keeps the current one; a value resets it.
        if (! empty($validated['password'])) {
            $data['password'] = hash('sha256', $validated['password']);
        }

        DB::table('users')->where('id', $id)->update($data);

        return response()->json(['data' => $this->row($id)]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if ($this->isAdminLinked($id)) {
            return response()->json([
                'error' => 'This account is linked to an admin and cannot be deleted.',
            ], 422);
        }

        $deleted = DB::table('users')->where('id', $id)->delete();
        if (! $deleted) {
            return response()->json(['error' => 'Account not found.'], 404);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Bulk delete multiple accounts in one request.
     *
     *   DELETE /api/v1/admin/users/bulk  { "ids": [1, 2, 3] }
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
        ]);

        // The admin-linked account is always excluded — it's the account
        // visitors DM. Report it so the UI can explain what was skipped.
        $ids = array_values(array_filter($validated['ids'], fn ($id) => ! $this->isAdminLinked($id)));

        $deleted = count($ids) > 0
            ? DB::table('users')->whereIn('id', $ids)->delete()
            : 0;

        return response()->json([
            'data' => [
                'deleted' => $deleted,
                'protected' => count($validated['ids']) - $deleted,
            ],
        ]);
    }

    /**
     * Blacklist an account — locks it out of private chat.
     *   POST /api/v1/admin/users/{id}/ban
     */
    public function ban(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if ($this->isAdminLinked($id)) {
            return response()->json([
                'error' => 'This account is linked to an admin and cannot be blacklisted.',
            ], 422);
        }

        $updated = DB::table('users')->where('id', $id)->update([
            'banned_at' => now(),
            'updated_at' => now(),
        ]);
        if (! $updated) {
            return response()->json(['error' => 'Account not found.'], 404);
        }

        return response()->json(['data' => $this->row($id)]);
    }

    /**
     * Remove an account from the blacklist.
     *   POST /api/v1/admin/users/{id}/unban
     */
    public function unban(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $updated = DB::table('users')->where('id', $id)->update([
            'banned_at' => null,
            'updated_at' => now(),
        ]);
        if (! $updated) {
            return response()->json(['error' => 'Account not found.'], 404);
        }

        return response()->json(['data' => $this->row($id)]);
    }

    /** Shape a single users row (with admin/protection flags). */
    private function row(int $id): array
    {
        $u = DB::table('users')->where('id', $id)->first();

        return [
            'id' => (int) $u->id,
            'name' => (string) $u->name,
            'email' => (string) $u->email,
            'password' => (string) $u->password,
            'is_admin' => $this->isAdminLinked($id),
            'banned_at' => $u->banned_at ?? null,
            'conversations' => 0,
            'created_at' => (string) ($u->created_at ?? ''),
        ];
    }

    private function isAdminLinked(int $userId): bool
    {
        return DB::table('admins')->where('user_id', $userId)->exists();
    }

    /**
     * Reuse the AuthController session guard.
     */
    private function guard(Request $request): bool
    {
        return app(AuthController::class)->adminFromRequest($request) !== null;
    }
}
