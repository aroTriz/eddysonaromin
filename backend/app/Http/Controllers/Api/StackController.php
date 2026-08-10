<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StackGroup;
use Illuminate\Http\JsonResponse;

/**
 * Public tech-stack endpoint.
 *   GET /api/v1/stack → stack categories, ordered by sort_order.
 */
class StackController extends Controller
{
    public function index(): JsonResponse
    {
        $groups = StackGroup::query()
            ->whereNull('archived_at')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'label', 'items', 'sort_order']);

        return response()->json(['data' => $groups]);
    }
}
