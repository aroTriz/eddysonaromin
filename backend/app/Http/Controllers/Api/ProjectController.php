<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * Display a listing of the projects.
     *
     * Query params:
     *  - category: personal | academic
     *  - type:     documentation | ai-tools | game | web-app | ml-data | ar-mobile | networking
     *  - featured: 1 to only return featured projects
     */
    public function index(Request $request): JsonResponse
    {
        $projects = Project::query()
            ->when($request->filled('category'), fn ($query) => $query->ofCategory($request->string('category')))
            ->when($request->filled('type'), fn ($query) => $query->ofType($request->string('type')))
            ->when($request->boolean('featured'), fn ($query) => $query->featured())
            ->orderBy('sort_order')
            ->orderByDesc('year')
            ->get();

        return response()->json(['data' => $projects]);
    }

    /**
     * Display the specified project by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $project = Project::where('slug', $slug)->firstOrFail();

        return response()->json(['data' => $project]);
    }
}
