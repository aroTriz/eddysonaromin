<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reference;
use Illuminate\Http\JsonResponse;

/**
 * Public references endpoint.
 *   GET /api/v1/references        → all references, ordered by sort_order
 *   GET /api/v1/references/{slug} → single reference by slug
 */
class ReferenceController extends Controller
{
    public function index(): JsonResponse
    {
        $references = Reference::query()
            ->whereNull('archived_at')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'slug', 'initials', 'name', 'title', 'email', 'photo_url', 'summary', 'sort_order']);

        return response()
            ->json(['data' => $references])
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }

    public function show(string $slug): JsonResponse
    {
        $reference = Reference::query()
            ->where('slug', $slug)
            ->whereNull('archived_at')
            ->first();

        if (! $reference) {
            return response()->json(['message' => 'Reference not found.'], 404);
        }

        return response()
            ->json(['data' => $reference])
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
}
