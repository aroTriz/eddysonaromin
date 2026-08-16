<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Projects CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/projects       → all projects (including archived)
 *   POST   /api/v1/admin/projects       → create a project
 *   POST   /api/v1/admin/projects/media → upload a showcase image/video
 *   GET    /api/v1/admin/projects/{id}  → single project (any status)
 *   PUT    /api/v1/admin/projects/{id}  → update a project
 *   DELETE /api/v1/admin/projects/{id}  → delete a project
 *   DELETE /api/v1/admin/projects/bulk  → bulk delete (ids array)
 *   POST   /api/v1/admin/projects/{id}/archive → hide from the public site
 *   POST   /api/v1/admin/projects/{id}/restore → show again
 *
 * The `showcase` field is the device-media config for the detail page:
 *   { "laptops": ["https://…" | {src, kind}], "phones": […] }
 * Each entry is either a legacy URL string (image) or an uploaded media
 * object {src, kind: "image"|"video"} tagged with its device. Empty or
 * missing lists fall back to `image_url` on the public site, so existing
 * projects keep their current look.
 */
class AdminProjectController extends Controller
{
    /** Valid project types (must match the frontend Project type union). */
    private const TYPES = [
        'documentation',
        'ai-tools',
        'game',
        'web-app',
        'ml-data',
        'ar-mobile',
        'networking',
    ];

    public function index(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // ?archived=1 lists only archived projects; default lists active ones.
        $projects = Project::query()
            ->when(
                $request->boolean('archived'),
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->orderBy('sort_order')
            ->orderByDesc('year')
            ->get();

        return response()->json(['data' => $projects]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate($this->rules());

        $project = Project::create([
            'title' => trim($validated['title']),
            'slug' => $this->uniqueSlug($validated['title']),
            'category' => $validated['category'],
            'type' => $validated['type'],
            'summary' => trim($validated['summary']),
            'tagline' => $this->nullableTrim($validated['tagline'] ?? null),
            'description' => $this->nullableTrim($validated['description'] ?? null),
            'role' => $this->nullableTrim($validated['role'] ?? null),
            'year' => $this->nullableTrim($validated['year'] ?? null),
            'featured' => (bool) ($validated['featured'] ?? false),
            'technologies' => $validated['technologies'] ?? [],
            'url' => $this->nullableTrim($validated['url'] ?? null),
            'source_url' => $this->nullableTrim($validated['source_url'] ?? null),
            'image_url' => $this->nullableTrim($validated['image_url'] ?? null),
            'favicon_url' => $this->nullableTrim($validated['favicon_url'] ?? null),
            'showcase' => $this->normalizeShowcase($validated['showcase'] ?? null),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ]);

        return response()->json(['data' => $project->fresh()], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return response()->json(['data' => Project::findOrFail($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $project = Project::findOrFail($id);

        $validated = $request->validate($this->rules($id, true));

        // Partial updates: fall back to the project's current values so a
        // single-field PUT never wipes the rest.
        $title = trim($validated['title'] ?? $project->title);

        $data = [
            'title' => $title,
            'category' => $validated['category'] ?? $project->category,
            'type' => $validated['type'] ?? $project->type,
            'summary' => trim($validated['summary'] ?? $project->summary),
            'tagline' => array_key_exists('tagline', $validated)
                ? $this->nullableTrim($validated['tagline'])
                : $project->tagline,
            'description' => array_key_exists('description', $validated)
                ? $this->nullableTrim($validated['description'])
                : $project->description,
            'role' => array_key_exists('role', $validated)
                ? $this->nullableTrim($validated['role'])
                : $project->role,
            'year' => array_key_exists('year', $validated)
                ? $this->nullableTrim($validated['year'])
                : $project->year,
            'featured' => array_key_exists('featured', $validated)
                ? (bool) $validated['featured']
                : (bool) $project->featured,
            'technologies' => $validated['technologies'] ?? $project->technologies,
            'url' => array_key_exists('url', $validated)
                ? $this->nullableTrim($validated['url'])
                : $project->url,
            'source_url' => array_key_exists('source_url', $validated)
                ? $this->nullableTrim($validated['source_url'])
                : $project->source_url,
            'image_url' => array_key_exists('image_url', $validated)
                ? $this->nullableTrim($validated['image_url'])
                : $project->image_url,
            'favicon_url' => array_key_exists('favicon_url', $validated)
                ? $this->nullableTrim($validated['favicon_url'])
                : $project->favicon_url,
            'showcase' => array_key_exists('showcase', $validated)
                ? $this->normalizeShowcase($validated['showcase'])
                : $project->showcase,
            'sort_order' => array_key_exists('sort_order', $validated)
                ? (int) $validated['sort_order']
                : (int) $project->sort_order,
        ];

        // Re-slug only when the title changed.
        if ($title !== $project->title) {
            $data['slug'] = $this->uniqueSlug($title, $project->id);
        }

        $project->update($data);

        return response()->json(['data' => $project->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $project = Project::findOrFail($id);
        $project->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Upload a showcase image/video (multipart form data).
     *
     *   POST /api/v1/admin/projects/media
     *     file:   jpg/jpeg/png/gif/webp (≤8MB) or mp4/webm/mov (≤60MB)
     *     device: laptop | phone
     *
     * Saves the file under public/uploads/project-media/{device}/ and returns
     * the served relative URL + the detected media kind so the editor can tag
     * the item ("image" vs "video") without guessing from the file name.
     */
    public function media(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'device' => ['required', Rule::in(['laptop', 'phone'])],
            'file' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime',
                $this->mediaSizeRule(),
            ],
        ]);

        /** @var UploadedFile $file */
        $file = $validated['file'];
        $device = $validated['device'];
        $mime = (string) $file->getMimeType();
        $kind = str_starts_with($mime, 'video/') ? 'video' : 'image';
        $ext = strtolower((string) ($file->getClientOriginalExtension() ?: ($kind === 'video' ? 'mp4' : 'jpg')));
        $name = Str::random(24).'.'.$ext;

        $dir = public_path("uploads/project-media/{$device}");
        File::ensureDirectoryExists($dir);
        $file->move($dir, $name);

        return response()->json([
            'data' => [
                'url' => "/uploads/project-media/{$device}/{$name}",
                'kind' => $kind,
            ],
        ], 201);
    }

    /**
     * Upload a project card image (cover) or favicon.
     *
     *   POST /api/v1/admin/projects/image
     *     file: jpg/jpeg/png/gif/webp/svg (≤8MB)
     *     kind: cover | favicon
     *
     * Saves the file under public/uploads/project-media/{kind}/ and returns
     * the served relative URL so the editor can store it in image_url /
     * favicon_url — no URL typing needed.
     */
    public function image(Request $request): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'kind' => ['required', Rule::in(['cover', 'favicon'])],
            'file' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
                $this->mediaSizeRule(),
            ],
        ]);

        /** @var UploadedFile $file */
        $file = $validated['file'];
        $kind = $validated['kind'];
        $mime = (string) $file->getMimeType();
        $ext = strtolower((string) ($file->getClientOriginalExtension() ?: 'png'));
        if ($ext === 'svgz') {
            $ext = 'svg';
        }
        $name = Str::random(24).'.'.$ext;

        $dir = public_path("uploads/project-media/{$kind}");
        File::ensureDirectoryExists($dir);
        $file->move($dir, $name);

        return response()->json([
            'data' => [
                'url' => "/uploads/project-media/{$kind}/{$name}",
            ],
        ], 201);
    }

    /**
     * Bulk delete multiple projects in one request.
     *
     *   DELETE /api/v1/admin/projects/bulk  { "ids": [1, 2, 3] }
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

        $deleted = Project::whereIn('id', $validated['ids'])->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    /**
     * Archive a project — hides it from the public site and active admin list.
     *
     *   POST /api/v1/admin/projects/{id}/archive
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $project = Project::findOrFail($id);
        $project->update(['archived_at' => now()]);

        return response()->json(['data' => $project->fresh()]);
    }

    /**
     * Restore an archived project.
     *
     *   POST /api/v1/admin/projects/{id}/restore
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $this->guard($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $project = Project::findOrFail($id);
        $project->update(['archived_at' => null]);

        return response()->json(['data' => $project->fresh()]);
    }

    /** Validation rules for store/update. Partial (sometimes) when updating. */
    private function rules(?int $id = null, bool $partial = false): array
    {
        $req = static fn (array $rules): array => $partial
            ? array_map(static fn ($r) => array_merge(['sometimes'], (array) $r), $rules)
            : $rules;

        return $req([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(['personal', 'academic'])],
            'type' => ['required', Rule::in(self::TYPES)],
            'summary' => ['required', 'string', 'max:1000'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'role' => ['nullable', 'string', 'max:255'],
            'year' => ['nullable', 'string', 'max:4'],
            'featured' => ['sometimes', 'boolean'],
            'technologies' => ['nullable', 'array'],
            'technologies.*' => ['string', 'max:60'],
            'url' => ['nullable', 'url', 'max:1000'],
            'source_url' => ['nullable', 'url', 'max:1000'],
            'image_url' => ['nullable', 'string', 'max:1000'],
            'favicon_url' => ['nullable', 'string', 'max:1000'],
            'showcase' => ['nullable', 'array'],
            'showcase.laptops' => ['nullable', 'array'],
            'showcase.laptops.*' => ['nullable', $this->showcaseItemRule()],
            'showcase.phones' => ['nullable', 'array'],
            'showcase.phones.*' => ['nullable', $this->showcaseItemRule()],
            'sort_order' => ['sometimes', 'integer'],
        ]);
    }

    /**
     * Each showcase item is either a legacy URL string or an uploaded media
     * object: { "src": "/uploads/…", "kind": "image" | "video" }.
     */
    private function showcaseItemRule(): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail): void {
            $valid = is_string($value)
                || (
                    is_array($value)
                    && isset($value['src'])
                    && is_string($value['src'])
                    && in_array($value['kind'] ?? 'image', ['image', 'video'], true)
                );

            if (! $valid) {
                $fail('Each showcase item must be a URL string or a {src, kind} media object.');
            }
        };
    }

    /** Images ≤8MB, videos ≤60MB (checked against the real MIME type). */
    private function mediaSizeRule(): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail): void {
            if (! $value instanceof UploadedFile) {
                return;
            }
            $isImage = str_starts_with((string) $value->getMimeType(), 'image/');
            $limitKb = $isImage ? 8192 : 61440;
            if ($value->getSize() > $limitKb * 1024) {
                $fail($isImage
                    ? 'Images must be 8MB or smaller.'
                    : 'Videos must be 60MB or smaller.');
            }
        };
    }

    /**
     * Keep only valid showcase items — non-empty URL strings and normalized
     * media objects. Filters out everything else (nulls, empty strings, junk).
     */
    private function normalizeShowcase(?array $showcase): ?array
    {
        if ($showcase === null) {
            return null;
        }

        $clean = static function (mixed $list): array {
            if (! is_array($list)) {
                return [];
            }
            $out = [];
            foreach ($list as $item) {
                if (is_string($item) && trim($item) !== '') {
                    $out[] = trim($item);
                } elseif (
                    is_array($item)
                    && isset($item['src'])
                    && is_string($item['src'])
                    && trim($item['src']) !== ''
                ) {
                    $out[] = [
                        'src' => trim($item['src']),
                        'kind' => ($item['kind'] ?? 'image') === 'video' ? 'video' : 'image',
                    ];
                }
            }

            return array_values($out);
        };

        return [
            'laptops' => $clean($showcase['laptops'] ?? []),
            'phones' => $clean($showcase['phones'] ?? []),
        ];
    }

    private function nullableTrim(mixed $value): ?string
    {
        $trimmed = is_string($value) ? trim($value) : $value;

        return $trimmed === '' || $trimmed === null ? null : $trimmed;
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

        while (Project::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}
