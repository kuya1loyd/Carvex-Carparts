
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;

Route::get('/auth/redirect/google', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/callback/google', [AuthController::class, 'handleGoogleCallback']);

$spaResponse = function () {
    return response()
        ->view('welcome')
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
};

$cleanupServiceWorker = <<<'JS'
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.registration.unregister());
});
JS;

$serviceWorkerResponse = function () use ($cleanupServiceWorker) {
    return response($cleanupServiceWorker, 200, [
        'Content-Type' => 'application/javascript; charset=UTF-8',
        'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma' => 'no-cache',
        'Expires' => '0',
        'Service-Worker-Allowed' => '/',
    ]);
};

$manifestResponse = function () {
    return response()->json([
        'name' => 'CarVex',
        'short_name' => 'CarVex',
        'start_url' => '/',
        'display' => 'standalone',
        'background_color' => '#ffffff',
        'theme_color' => '#111827',
        'icons' => [],
    ], 200, [
        'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma' => 'no-cache',
        'Expires' => '0',
    ]);
};

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/sw.js', $serviceWorkerResponse);
Route::get('/service-worker.js', $serviceWorkerResponse);
Route::get('/manifest.json', $manifestResponse);
Route::get('/manifest.webmanifest', $manifestResponse);

Route::get('/', $spaResponse);

// Catch all routes - let React Router handle frontend routing
Route::fallback($spaResponse);
