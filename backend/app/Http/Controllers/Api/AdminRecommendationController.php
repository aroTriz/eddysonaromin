<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recommendation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Recommendations CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/recommendations       → all testimonials
 *   POST   /api/v1/admin/recommendations       → create a testimonial
 *   GET    /api/v1/admin/recommendations/{id}  → single testimonial
 *   PUT    /api/v1/admin/recommendations/{id}  → update a testimonial
 *   DELETE /api/v1/admin/recommendations/{id}  → delete a testimonial
 *   DELETE /api/v1/admin/recommendations/bulk  → bulk delete (ids array)
 */
class AdminRecommendationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // ?archived=1 lists only archived testimonials; default lists active ones.
        $recommendations = Recommendation::query()
            ->when(
                $request->boolean('archived'),
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $recommendations]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'initials' => ['required', 'string', 'max:8'],
            'quote' => ['required', 'string'],
            'author' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $recommendation = Recommendation::create([
            'initials' => $validated['initials'],
            'quote' => $validated['quote'],
            'author' => $validated['author'],
            'role' => $validated['role'],
            'email' => $validated['email'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $recommendation], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return response()->json(['data' => Recommendation::findOrFail($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $recommendation = Recommendation::findOrFail($id);

        $validated = $request->validate([
            'initials' => ['sometimes', 'string', 'max:8'],
            'quote' => ['sometimes', 'string'],
            'author' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $recommendation->update($validated);

        return response()->json(['data' => $recommendation->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        Recommendation::findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Archive a testimonial — hides it from the public site and active admin list.
     *
     *   POST /api/v1/admin/recommendations/{id}/archive
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $recommendation = Recommendation::findOrFail($id);
        $recommendation->update(['archived_at' => now()]);

        return response()->json(['data' => $recommendation->fresh()]);
    }

    /**
     * Restore an archived testimonial.
     *
     *   POST /api/v1/admin/recommendations/{id}/restore
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $recommendation = Recommendation::findOrFail($id);
        $recommendation->update(['archived_at' => null]);

        return response()->json(['data' => $recommendation->fresh()]);
    }

    /**
     * Bulk delete multiple testimonials in one request.
     *
     *   DELETE /api/v1/admin/recommendations/bulk  { "ids": [1, 2, 3] }
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

        $deleted = Recommendation::whereIn('id', $validated['ids'])->delete();

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
