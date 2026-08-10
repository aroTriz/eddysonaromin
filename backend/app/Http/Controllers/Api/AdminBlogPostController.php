<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Blog CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/blog/posts       → all posts (including drafts)
 *   POST   /api/v1/admin/blog/posts       → create a post
 *   GET    /api/v1/admin/blog/posts/{id}  → single post (any status)
 *   PUT    /api/v1/admin/blog/posts/{id}  → update a post
 *   DELETE /api/v1/admin/blog/posts/{id}  → delete a post
 */
class AdminBlogPostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // ?archived=1 lists only archived posts; default lists active ones.
        $posts = BlogPost::query()
            ->when(
                $request->boolean('archived'),
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->orderByDesc('published_at')
            ->get();

        return response()->json(['data' => $posts]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['required', 'string', 'max:500'],
            'content' => ['required', 'string'],
            'images' => ['nullable', 'array'],
            'tags' => ['nullable', 'array'],
            'published_at' => ['nullable', 'date'],
        ]);

        $slug = $this->uniqueSlug($validated['title']);

        $post = BlogPost::create([
            'title' => $validated['title'],
            'slug' => $slug,
            'excerpt' => $validated['excerpt'],
            'content' => $validated['content'],
            'images' => $validated['images'] ?? [],
            'tags' => $validated['tags'] ?? [],
            'published_at' => $validated['published_at'] ?? now(),
        ]);

        return response()->json(['data' => $post], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $post = BlogPost::findOrFail($id);

        return response()->json(['data' => $post]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $post = BlogPost::findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'excerpt' => ['sometimes', 'string', 'max:500'],
            'content' => ['sometimes', 'string'],
            'images' => ['nullable', 'array'],
            'tags' => ['nullable', 'array'],
            'published_at' => ['nullable', 'date'],
        ]);

        // Re-slug only when the title changed.
        if (! empty($validated['title']) && $validated['title'] !== $post->title) {
            $validated['slug'] = $this->uniqueSlug($validated['title'], $post->id);
        }

        $post->update($validated);

        return response()->json(['data' => $post->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $post = BlogPost::findOrFail($id);
        $post->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Archive a post — hides it from the public site and active admin list.
     *
     *   POST /api/v1/admin/blog/posts/{id}/archive
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $post = BlogPost::findOrFail($id);
        $post->update(['archived_at' => now()]);

        return response()->json(['data' => $post->fresh()]);
    }

    /**
     * Restore an archived post.
     *
     *   POST /api/v1/admin/blog/posts/{id}/restore
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $post = BlogPost::findOrFail($id);
        $post->update(['archived_at' => null]);

        return response()->json(['data' => $post->fresh()]);
    }

    /**
     * Bulk delete multiple posts in one request.
     *
     *   DELETE /api/v1/admin/blog/posts/bulk  { "ids": [1, 2, 3] }
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

        $deleted = BlogPost::whereIn('id', $validated['ids'])->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    /**
     * Reuse the AuthController session guard.
     */
    private function guard(Request $request): bool
    {
        return app(AuthController::class)->adminFromRequest($request) !== null;
    }

    /**
     * Slugify a title, appending a counter until it is unique.
     */
    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 2;

        while (BlogPost::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}
