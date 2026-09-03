<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recommendation;
use Illuminate\Http\JsonResponse;

/**
 * Public testimonials endpoint.
 *   GET /api/v1/recommendations → all testimonials, ordered by sort_order.
 */
class RecommendationController extends Controller
{
    public function index(): JsonResponse
    {
        $recommendations = Recommendation::query()
            ->whereNull('archived_at')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'initials', 'quote', 'author', 'role', 'email', 'photo_url', 'sort_order']);

        return response()
            ->json(['data' => $recommendations])
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
}
