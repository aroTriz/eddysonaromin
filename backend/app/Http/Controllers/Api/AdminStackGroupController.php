<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StackGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tech-stack CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/stack/groups       → all categories
 *   POST   /api/v1/admin/stack/groups       → create a category
 *   GET    /api/v1/admin/stack/groups/{id}  → single category
 *   PUT    /api/v1/admin/stack/groups/{id}  → update (label/items)
 *   DELETE /api/v1/admin/stack/groups/{id}  → delete a category
 */
class AdminStackGroupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // ?archived=1 lists only archived categories; default lists active ones.
        $groups = StackGroup::query()
            ->when(
                $request->boolean('archived'),
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $groups]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:120', 'unique:stack_groups,label'],
            'items' => ['nullable', 'array'],
            'items.*' => ['string', 'max:120'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $group = StackGroup::create([
            'label' => $validated['label'],
            'items' => $validated['items'] ?? [],
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $group], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return response()->json(['data' => StackGroup::findOrFail($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $group = StackGroup::findOrFail($id);

        $validated = $request->validate([
            'label' => ['sometimes', 'string', 'max:120', 'unique:stack_groups,label,'.$group->id],
            'items' => ['sometimes', 'array'],
            'items.*' => ['string', 'max:120'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $group->update($validated);

        return response()->json(['data' => $group->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        StackGroup::findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Archive a category — hides it from the public site and active admin list.
     *
     *   POST /api/v1/admin/stack/groups/{id}/archive
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $group = StackGroup::findOrFail($id);
        $group->update(['archived_at' => now()]);

        return response()->json(['data' => $group->fresh()]);
    }

    /**
     * Restore an archived category.
     *
     *   POST /api/v1/admin/stack/groups/{id}/restore
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $group = StackGroup::findOrFail($id);
        $group->update(['archived_at' => null]);

        return response()->json(['data' => $group->fresh()]);
    }

    /**
     * Bulk delete multiple categories in one request.
     *
     *   DELETE /api/v1/admin/stack/groups/bulk  { "ids": [1, 2, 3] }
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

        $deleted = StackGroup::whereIn('id', $validated['ids'])->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    /**
     * Reuse the AuthController session guard.
     */
    private function guard(Request $request): bool
    {
        return app(AuthController::class)->adminFromRequest($request) !== null;
    }
}
