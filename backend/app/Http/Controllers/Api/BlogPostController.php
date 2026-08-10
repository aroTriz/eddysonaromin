<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;

class BlogPostController extends Controller
{
    /**
     * Display a listing of the published blog posts.
     */
    public function index(): JsonResponse
    {
        $posts = BlogPost::query()
            ->published()
            ->whereNull('archived_at')
            ->orderByDesc('published_at')
            ->get();

        return response()->json(['data' => $posts]);
    }

    /**
     * Display the specified blog post by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $post = BlogPost::where('slug', $slug)
            ->published()
            ->whereNull('archived_at')
            ->firstOrFail();

        return response()->json(['data' => $post]);
    }
}
