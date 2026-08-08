<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Visitor counter.
 *   GET  /api/v1/visitors → current count
 *   POST /api/v1/visitors → increment and return the new count
 * Mirrors the previous projects' Cloudflare `counter.ts` behaviour.
 */
class VisitorController extends Controller
{
    public function index(): JsonResponse
    {
        $visitor = DB::table('visitors')->where('site', 'portfolio')->first();

        return response()->json(['count' => $visitor->count ?? 0]);
    }

    public function increment(): JsonResponse
    {
        DB::table('visitors')
            ->where('site', 'portfolio')
            ->increment('count');

        $visitor = DB::table('visitors')->where('site', 'portfolio')->first();

        return response()->json(['count' => $visitor->count ?? 0]);
    }
}
