<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard stats for the /aromin admin area (authenticated).
 */
class AdminController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        // Require a valid admin session — reuse AuthController's guard.
        $auth = app(AuthController::class);
        $admin = $auth->adminFromRequest($request);

        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $visitor = DB::table('visitors')
            ->where('site', 'portfolio')
            ->first();

        $posts = BlogPost::count();
        $projects = DB::table('projects')->count();
        $messages = DB::table('contact_messages')->count();
        $recommendations = DB::table('recommendations')->count();

        return response()->json([
            'data' => [
                'visitors' => $visitor->count ?? 0,
                'posts' => $posts,
                'projects' => $projects,
                'messages' => $messages,
                'recommendations' => $recommendations,
            ],
        ]);
    }
}
