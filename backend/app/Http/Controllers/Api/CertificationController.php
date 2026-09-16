<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use Illuminate\Http\JsonResponse;

/**
 * Public certifications endpoint.
 *   GET /api/v1/certifications        → all certifications, ordered by sort_order
 *   GET /api/v1/certifications/{slug} → single certification by slug
 */
class CertificationController extends Controller
{
    public function index(): JsonResponse
    {
        $certifications = Certification::query()
            ->whereNull('archived_at')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'slug', 'title', 'issuer', 'year', 'category', 'summary', 'sort_order']);

        return response()
            ->json(['data' => $certifications])
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }

    public function show(string $slug): JsonResponse
    {
        $certification = Certification::query()
            ->where('slug', $slug)
            ->whereNull('archived_at')
            ->first();

        if (! $certification) {
            return response()->json(['message' => 'Certification not found.'], 404);
        }

        return response()
            ->json(['data' => $certification])
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
}
