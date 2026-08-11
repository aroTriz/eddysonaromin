<?php

use App\Http\Controllers\Api\AdminBlogPostController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminRecommendationController;
use App\Http\Controllers\Api\AdminStackGroupController;
use App\Http\Controllers\Api\AskController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminChatController;
use App\Http\Controllers\Api\AdminPrivateChatController;
use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\GithubController;
use App\Http\Controllers\Api\PrivateChatController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\RecommendationController;
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

    // ── Community chat ─────────────────────────────────────────
    Route::get('/chat', [ChatController::class, 'index']);
    Route::get('/chat/stream', [ChatController::class, 'stream']);
    Route::post('/chat', [ChatController::class, 'store']);
    Route::get('/chat/identity', [ChatController::class, 'identityGet']);
    Route::post('/chat/identity', [ChatController::class, 'identityPost']);

    // ── Private chat (visitor ↔ admin DMs) ─────────────────────
    Route::post('/private/auth/register', [PrivateChatController::class, 'register']);
    Route::post('/private/auth/login', [PrivateChatController::class, 'login']);
    Route::post('/private/auth/logout', [PrivateChatController::class, 'logout']);
    Route::get('/private/auth/session', [PrivateChatController::class, 'session']);

    Route::get('/private/admin', [PrivateChatController::class, 'admin']);
    Route::post('/private/conversations', [PrivateChatController::class, 'start']);
    Route::get('/private/conversations/{id}/messages', [PrivateChatController::class, 'messages']);
    Route::post('/private/conversations/{id}/messages', [PrivateChatController::class, 'send']);
    Route::post('/private/conversations/{id}/read', [PrivateChatController::class, 'read']);
    Route::get('/private/conversations/{id}/stream', [PrivateChatController::class, 'stream']);

    Route::get('/github/{username}/contributions', [GithubController::class, 'contributions']);

    Route::post('/ask', [AskController::class, 'answer']);

    // ── Public tech stack ─────────────────────────────────────
    Route::get('/stack', [StackController::class, 'index']);

    // ── Public recommendations ────────────────────────────────
    Route::get('/recommendations', [RecommendationController::class, 'index']);

    // ── Admin auth (/aromin area) ──────────────────────────────
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/verify', [AuthController::class, 'verify']);
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/admin/stats', [AdminController::class, 'stats']);

    Route::get('/admin/chat/messages', [AdminChatController::class, 'index']);
    Route::delete('/admin/chat/messages/bulk', [AdminChatController::class, 'bulkDestroy']);
    Route::post('/admin/chat/messages/bulk/delete-after', [AdminChatController::class, 'bulkScheduledDelete']);
    Route::post('/admin/chat/messages/{id}/archive', [AdminChatController::class, 'archive']);
    Route::post('/admin/chat/messages/{id}/restore', [AdminChatController::class, 'restore']);
    Route::post('/admin/chat/messages/{id}/delete-after', [AdminChatController::class, 'scheduledDelete']);
    Route::delete('/admin/chat/messages/{id}', [AdminChatController::class, 'destroy']);

    Route::get('/admin/private/conversations', [AdminPrivateChatController::class, 'conversations']);
    Route::get('/admin/private/conversations/{id}/messages', [AdminPrivateChatController::class, 'messages']);
    Route::post('/admin/private/conversations/{id}/messages', [AdminPrivateChatController::class, 'send']);
    Route::post('/admin/private/conversations/{id}/read', [AdminPrivateChatController::class, 'read']);
    Route::get('/admin/private/conversations/{id}/stream', [AdminPrivateChatController::class, 'stream']);

    Route::get('/admin/blog/posts', [AdminBlogPostController::class, 'index']);
    Route::post('/admin/blog/posts', [AdminBlogPostController::class, 'store']);
    Route::delete('/admin/blog/posts/bulk', [AdminBlogPostController::class, 'bulkDestroy']);
    Route::get('/admin/blog/posts/{id}', [AdminBlogPostController::class, 'show']);
    Route::put('/admin/blog/posts/{id}', [AdminBlogPostController::class, 'update']);
    Route::post('/admin/blog/posts/{id}/archive', [AdminBlogPostController::class, 'archive']);
    Route::post('/admin/blog/posts/{id}/restore', [AdminBlogPostController::class, 'restore']);
    Route::delete('/admin/blog/posts/{id}', [AdminBlogPostController::class, 'destroy']);

    Route::get('/admin/stack/groups', [AdminStackGroupController::class, 'index']);
    Route::post('/admin/stack/groups', [AdminStackGroupController::class, 'store']);
    Route::delete('/admin/stack/groups/bulk', [AdminStackGroupController::class, 'bulkDestroy']);
    Route::get('/admin/stack/groups/{id}', [AdminStackGroupController::class, 'show']);
    Route::put('/admin/stack/groups/{id}', [AdminStackGroupController::class, 'update']);
    Route::post('/admin/stack/groups/{id}/archive', [AdminStackGroupController::class, 'archive']);
    Route::post('/admin/stack/groups/{id}/restore', [AdminStackGroupController::class, 'restore']);
    Route::delete('/admin/stack/groups/{id}', [AdminStackGroupController::class, 'destroy']);

    Route::get('/admin/recommendations', [AdminRecommendationController::class, 'index']);
    Route::post('/admin/recommendations', [AdminRecommendationController::class, 'store']);
    Route::delete('/admin/recommendations/bulk', [AdminRecommendationController::class, 'bulkDestroy']);
    Route::get('/admin/recommendations/{id}', [AdminRecommendationController::class, 'show']);
    Route::put('/admin/recommendations/{id}', [AdminRecommendationController::class, 'update']);
    Route::post('/admin/recommendations/{id}/archive', [AdminRecommendationController::class, 'archive']);
    Route::post('/admin/recommendations/{id}/restore', [AdminRecommendationController::class, 'restore']);
    Route::delete('/admin/recommendations/{id}', [AdminRecommendationController::class, 'destroy']);

    // ── Visitor counter ────────────────────────────────────────
    Route::get('/visitors', [VisitorController::class, 'index']);
    Route::post('/visitors', [VisitorController::class, 'increment']);
});
