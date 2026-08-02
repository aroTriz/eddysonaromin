<?php

use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\GithubController;
use App\Http\Controllers\Api\ProjectController;
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
});
