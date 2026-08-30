<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Experience;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Experiences CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/experiences            → all entries (active or archived)
 *   POST   /api/v1/admin/experiences            → create entry
 *   GET    /api/v1/admin/experiences/{id}       → single entry
 *   PUT    /api/v1/admin/experiences/{id}       → update entry
 *   DELETE /api/v1/admin/experiences/{id}       → delete entry
 *   DELETE /api/v1/admin/experiences/bulk       → bulk delete (ids array)
 *   POST   /api/v1/admin/experiences/{id}/archive|restore
 *   POST   /api/v1/admin/experiences/upload     → upload image (logo, album, cert)
 */
class AdminExperienceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $archived = $request->boolean('archived');

        $experiences = Experience::query()
            ->when(
                $archived,
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->orderByRaw("CASE type WHEN 'experience' THEN 0 WHEN 'education' THEN 1 END")
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $experiences]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:experience,education'],
            'period' => ['required', 'string', 'max:255'],
            'year' => ['required', 'string', 'max:255'],
            'tag' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'company' => ['required', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string'],
            'website_url' => ['nullable', 'string'],
            'tooltip_desc' => ['nullable', 'string'],
            'albums' => ['nullable', 'array'],
            'certificates' => ['nullable', 'array'],
            'description' => ['nullable', 'string'],
            'highlights' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $experience = Experience::create([
            'type' => $validated['type'],
            'period' => $validated['period'],
            'year' => $validated['year'],
            'tag' => $validated['tag'],
            'title' => $validated['title'],
            'company' => $validated['company'],
            'logo_url' => $validated['logo_url'] ?? null,
            'website_url' => $validated['website_url'] ?? null,
            'tooltip_desc' => $validated['tooltip_desc'] ?? null,
            'albums' => $validated['albums'] ?? [],
            'certificates' => $validated['certificates'] ?? [],
            'description' => $validated['description'] ?? '',
            'highlights' => $validated['highlights'] ?? [],
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $experience], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $experience = Experience::find($id);
        if (! $experience) {
            return response()->json(['message' => 'Experience not found.'], 404);
        }

        return response()->json(['data' => $experience]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $experience = Experience::find($id);
        if (! $experience) {
            return response()->json(['message' => 'Experience not found.'], 404);
        }

        $validated = $request->validate([
            'type' => ['sometimes', 'string', 'in:experience,education'],
            'period' => ['sometimes', 'string', 'max:255'],
            'year' => ['sometimes', 'string', 'max:255'],
            'tag' => ['sometimes', 'string', 'max:255'],
            'title' => ['sometimes', 'string', 'max:255'],
            'company' => ['sometimes', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string'],
            'website_url' => ['nullable', 'string'],
            'tooltip_desc' => ['nullable', 'string'],
            'albums' => ['nullable', 'array'],
            'certificates' => ['nullable', 'array'],
            'description' => ['nullable', 'string'],
            'highlights' => ['nullable', 'array'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $experience->update($validated);

        return response()->json(['data' => $experience->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $experience = Experience::find($id);
        if (! $experience) {
            return response()->json(['message' => 'Experience not found.'], 404);
        }

        $experience->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Archive an experience — hides from the public site and active admin list.
     *
     *   POST /api/v1/admin/experiences/{id}/archive
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $experience = Experience::find($id);
        if (! $experience) {
            return response()->json(['message' => 'Experience not found.'], 404);
        }

        $experience->update(['archived_at' => now()]);

        return response()->json(['data' => $experience->fresh()]);
    }

    /**
     * Restore an archived experience.
     *
     *   POST /api/v1/admin/experiences/{id}/restore
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $experience = Experience::find($id);
        if (! $experience) {
            return response()->json(['message' => 'Experience not found.'], 404);
        }

        $experience->update(['archived_at' => null]);

        return response()->json(['data' => $experience->fresh()]);
    }

    /**
     * Bulk delete multiple experiences in one request.
     *
     *   DELETE /api/v1/admin/experiences/bulk  { "ids": [1, 2, 3] }
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

        $deleted = Experience::whereIn('id', $validated['ids'])->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    /**
     * Upload an image for experience entries (logo, album, cert).
     * Accepts a base64 data-URL and echoes it back (stored client-side).
     *
     *   POST /api/v1/admin/experiences/upload  { "image": "data:image/..." }
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
