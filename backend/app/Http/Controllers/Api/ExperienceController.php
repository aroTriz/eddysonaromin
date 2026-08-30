<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Experience;
use Illuminate\Http\JsonResponse;

/**
 * Public experiences endpoint.
 *   GET /api/v1/experiences → all non-archived entries, sorted by type + order.
 */
class ExperienceController extends Controller
{
    public function index(): JsonResponse
    {
        $experiences = Experience::query()
            ->whereNull('archived_at')
            ->orderByRaw("CASE type WHEN 'experience' THEN 0 WHEN 'education' THEN 1 END")
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()
            ->json(['data' => $experiences])
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
}
