<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * References CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/references       → all references (active or archived)
 *   POST   /api/v1/admin/references       → create a reference
 *   GET    /api/v1/admin/references/{id}  → single reference
 *   PUT    /api/v1/admin/references/{id}  → update a reference
 *   DELETE /api/v1/admin/references/{id}  → delete a reference
 *   DELETE /api/v1/admin/references/bulk  → bulk delete (ids array)
 *   POST   /api/v1/admin/references/{id}/archive|restore
 */
class AdminReferenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $references = Reference::query()
            ->when(
                $request->boolean('archived'),
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $references]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/', 'unique:references,slug'],
            'initials' => ['required', 'string', 'max:8'],
            'name' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'photo_url' => ['nullable', 'string'],
            'summary' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $validated['slug'] ?? Str::slug($validated['name']);
        // Ensure slug uniqueness — append suffix if needed.
        $base = $slug;
        $i = 2;
        while (Reference::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        $reference = Reference::create([
            'slug' => $slug,
            'initials' => $validated['initials'],
            'name' => $validated['name'],
            'title' => $validated['title'],
            'email' => $validated['email'] ?? null,
            'photo_url' => $validated['photo_url'] ?? null,
            'summary' => $validated['summary'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $reference], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return response()->json(['data' => Reference::findOrFail($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $reference = Reference::findOrFail($id);

        $validated = $request->validate([
            'slug' => ['sometimes', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/', 'unique:references,slug,' . $id],
            'initials' => ['sometimes', 'string', 'max:8'],
            'name' => ['sometimes', 'string', 'max:255'],
            'title' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'photo_url' => ['nullable', 'string'],
            'summary' => ['nullable', 'string'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        // Keep slug in sync if name changed but slug not explicitly sent — optional, keep existing slug by default.
        $reference->update($validated);

        return response()->json(['data' => $reference->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        Reference::findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Archive a reference — hides it from the public site and active admin list.
     *
     *   POST /api/v1/admin/references/{id}/archive
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $reference = Reference::findOrFail($id);
        $reference->update(['archived_at' => now()]);

        return response()->json(['data' => $reference->fresh()]);
    }

    /**
     * Restore an archived reference.
     *
     *   POST /api/v1/admin/references/{id}/restore
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $reference = Reference::findOrFail($id);
        $reference->update(['archived_at' => null]);

        return response()->json(['data' => $reference->fresh()]);
    }

    /**
     * Bulk delete multiple references in one request.
     *
     *   DELETE /api/v1/admin/references/bulk  { "ids": [1, 2, 3] }
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

        $deleted = Reference::whereIn('id', $validated['ids'])->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    /**
     * Upload a photo for a reference (avatar).
     * Accepts a base64 data-URL and echoes it back (stored client-side).
     *
     *   POST /api/v1/admin/references/upload  { "image": "data:image/..." }
     */
    public function upload(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'image' => ['required', 'string'],
        ]);

        $imageData = $validated['image'];
        if (! str_starts_with($imageData, 'data:image/')) {
            return response()->json(['error' => 'Invalid image data. Expected a base64 data-URL.'], 422);
        }

        if (strlen($imageData) > 5_500_000) {
            return response()->json(['error' => 'Image too large. Max ~3 MB decoded.'], 422);
        }

        return response()->json(['data' => ['url' => $imageData]]);
    }

    /**
     * Reuse the AuthController session guard.
     */
    private function guard(Request $request): bool
    {
        return app(AuthController::class)->adminFromRequest($request) !== null;
    }
}
