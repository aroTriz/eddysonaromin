<?php

use App\Http\Controllers\Api\AdminBlogPostController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminStackGroupController;
use App\Http\Controllers\Api\AskController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\GithubController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\StackController;
use App\Http\Controllers\Api\VisitorController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and are prefixed with
| the "api" prefix. Enjoy building your API!
|
*/

Route::prefix('v1')->group(function (): void {
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{slug}', [ProjectController::class, 'show']);

    Route::get('/blog/posts', [BlogPostController::class, 'index']);
    Route::get('/blog/posts/{slug}', [BlogPostController::class, 'show']);

    Route::post('/contact', [ContactController::class, 'store']);

    Route::get('/github/{username}/contributions', [GithubController::class, 'contributions']);

    Route::post('/ask', [AskController::class, 'answer']);

    // ── Public tech stack ─────────────────────────────────────
    Route::get('/stack', [StackController::class, 'index']);

    // ── Admin auth (/aromin area) ──────────────────────────────
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/verify', [AuthController::class, 'verify']);
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/admin/stats', [AdminController::class, 'stats']);

    Route::get('/admin/blog/posts', [AdminBlogPostController::class, 'index']);
    Route::post('/admin/blog/posts', [AdminBlogPostController::class, 'store']);
    Route::get('/admin/blog/posts/{id}', [AdminBlogPostController::class, 'show']);
    Route::put('/admin/blog/posts/{id}', [AdminBlogPostController::class, 'update']);
    Route::delete('/admin/blog/posts/{id}', [AdminBlogPostController::class, 'destroy']);

    Route::get('/admin/stack/groups', [AdminStackGroupController::class, 'index']);
    Route::post('/admin/stack/groups', [AdminStackGroupController::class, 'store']);
    Route::get('/admin/stack/groups/{id}', [AdminStackGroupController::class, 'show']);
    Route::put('/admin/stack/groups/{id}', [AdminStackGroupController::class, 'update']);
    Route::delete('/admin/stack/groups/{id}', [AdminStackGroupController::class, 'destroy']);

    // ── Visitor counter ────────────────────────────────────────
    Route::get('/visitors', [VisitorController::class, 'index']);
    Route::post('/visitors', [VisitorController::class, 'increment']);
});
