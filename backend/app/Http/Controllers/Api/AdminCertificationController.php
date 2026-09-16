<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Certifications CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/certifications       → all certifications (active or archived)
 *   POST   /api/v1/admin/certifications       → create a certification
 *   GET    /api/v1/admin/certifications/{id}  → single certification
 *   PUT    /api/v1/admin/certifications/{id}  → update a certification
 *   DELETE /api/v1/admin/certifications/{id}  → delete a certification
 *   DELETE /api/v1/admin/certifications/bulk  → bulk delete (ids array)
 *   POST   /api/v1/admin/certifications/{id}/archive|restore
 */
class AdminCertificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $certifications = Certification::query()
            ->when(
                $request->boolean('archived'),
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $certifications]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/', 'unique:certifications,slug'],
            'title' => ['required', 'string', 'max:255'],
            'issuer' => ['required', 'string', 'max:255'],
            'year' => ['required', 'string', 'max:16'],
            'category' => ['required', 'string', 'in:degree,certification'],
            'summary' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $validated['slug'] ?? Str::slug($validated['title']);
        $base = $slug;
        $i = 2;
        while (Certification::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        $certification = Certification::create([
            'slug' => $slug,
            'title' => $validated['title'],
            'issuer' => $validated['issuer'],
            'year' => $validated['year'],
            'category' => $validated['category'],
            'summary' => $validated['summary'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $certification], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return response()->json(['data' => Certification::findOrFail($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $certification = Certification::findOrFail($id);

        $validated = $request->validate([
            'slug' => ['sometimes', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/', 'unique:certifications,slug,' . $id],
            'title' => ['sometimes', 'string', 'max:255'],
            'issuer' => ['sometimes', 'string', 'max:255'],
            'year' => ['sometimes', 'string', 'max:16'],
            'category' => ['sometimes', 'string', 'in:degree,certification'],
            'summary' => ['nullable', 'string'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $certification->update($validated);

        return response()->json(['data' => $certification->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        Certification::findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $certification = Certification::findOrFail($id);
        $certification->update(['archived_at' => now()]);

        return response()->json(['data' => $certification->fresh()]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $certification = Certification::findOrFail($id);
        $certification->update(['archived_at' => null]);

        return response()->json(['data' => $certification->fresh()]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
        ]);

        $deleted = Certification::whereIn('id', $validated['ids'])->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    private function guard(Request $request): bool
    {
        return app(AuthController::class)->adminFromRequest($request) !== null;
    }
}
