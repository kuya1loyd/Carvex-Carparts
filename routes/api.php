<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\ProductController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\CartController;
use App\Http\Controllers\API\OrderController;
use App\Http\Controllers\API\AdminController;
use App\Http\Controllers\API\CustomerConcernController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\PromoCodeController;
use App\Http\Controllers\API\SellerListingController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| CarVex - Online Car Parts Shopping System
| All API endpoints for the application
|
*/

// Google OAuth
Route::get('/auth/redirect/google', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/callback/google', [AuthController::class, 'handleGoogleCallback']);

// Authentication Routes (Public)
Route::post('/auth/register', 'App\\Http\\Controllers\\API\\AuthController@register');
Route::post('/auth/login', 'App\\Http\\Controllers\\API\\AuthController@login');
Route::post('/auth/forgot-password', 'App\\Http\\Controllers\\API\\AuthController@forgotPassword');
Route::post('/auth/reset-password', 'App\\Http\\Controllers\\API\\AuthController@resetPassword');
Route::get('/auth/oauth-url/{provider}', 'App\\Http\\Controllers\\API\\AuthController@oauthUrl');

// Protected Authentication Routes
Route::middleware('local.auth')->group(function () {
    Route::post('/auth/logout', 'App\\Http\\Controllers\\API\\AuthController@logout');
    Route::get('/auth/me', 'App\\Http\\Controllers\\API\\AuthController@me');
    Route::put('/auth/profile', 'App\\Http\\Controllers\\API\\AuthController@updateProfile');
    Route::post('/auth/profile/avatar', 'App\\Http\\Controllers\\API\\AuthController@uploadAvatar');
    Route::post('/auth/change-password', 'App\\Http\\Controllers\\API\\AuthController@changePassword');
    Route::get('/customer-concerns', [CustomerConcernController::class, 'index']);
    Route::post('/customer-concerns', [CustomerConcernController::class, 'store']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notificationId}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/promo-codes/validate', [PromoCodeController::class, 'validateForCheckout']);
    Route::get('/seller/listings', [SellerListingController::class, 'index']);
    Route::post('/seller/listings', [SellerListingController::class, 'store']);
    Route::patch('/seller/listings/{id}', [SellerListingController::class, 'update']);
    Route::delete('/seller/listings/{id}', [SellerListingController::class, 'destroy']);
});

// Product Routes (Public)
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/featured', [ProductController::class, 'featured']);
Route::get('/products/hot-deals', [ProductController::class, 'hotDeals']);
Route::get('/products/premium', [ProductController::class, 'premium']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/products/category/{categoryId}', [ProductController::class, 'byCategory']);
Route::get('/products/{id}/stock', [ProductController::class, 'checkStock']);

// Category Routes (Public)
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);

// Cart Routes (Protected)
Route::middleware('local.auth')->group(function () {
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart/add', [CartController::class, 'add']);
    Route::patch('/cart/{cartItemId}', [CartController::class, 'update']);
    Route::delete('/cart/{cartItemId}', [CartController::class, 'remove']);
    Route::delete('/cart', [CartController::class, 'clear']);
    Route::get('/cart/summary', [CartController::class, 'summary']);
});

// Order Routes (Protected)
Route::middleware('local.auth')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/my-orders', [OrderController::class, 'myOrders']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::post('/orders', [OrderController::class, 'create']);
    Route::patch('/orders/{id}/cancel', [OrderController::class, 'cancel']);
    Route::patch('/orders/{id}/payment-status', [OrderController::class, 'updatePaymentStatus']);
});

// Admin Routes (Protected + Admin Only)
Route::middleware(['local.auth', 'admin'])->group(function () {
    // Dashboard
    Route::get('/admin/stats', [AdminController::class, 'stats']);
    Route::get('/admin/activity', [AdminController::class, 'activity']);
    
    // Admin Profile
    Route::post('/admin/profile', [AdminController::class, 'updateProfile']);
    
    // User Management
    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::delete('/admin/users', [AdminController::class, 'deleteUser']);
    Route::patch('/admin/users/{id}/toggle', [AdminController::class, 'toggleUser']);
    Route::post('/admin/users/{id}/notify', [AdminController::class, 'notifyUser']);
    Route::post('/admin/users/{id}/promo-code', [AdminController::class, 'sendPromoCode']);
    
    // Product Management
    Route::get('/admin/products', [AdminController::class, 'products']);
    Route::post('/admin/products', [AdminController::class, 'createProduct']);
    Route::patch('/admin/products/{id}', [AdminController::class, 'updateProduct']);
    Route::patch('/admin/products/{id}/review', [AdminController::class, 'reviewSellerListing']);
    Route::delete('/admin/products/{id}', [AdminController::class, 'deleteProduct']);
    Route::patch('/admin/products/{id}/deal-status', [ProductController::class, 'updateDealStatus']);
    
    // Category Management
    Route::post('/admin/categories', [AdminController::class, 'createCategory']);
    Route::patch('/admin/categories/{id}', [AdminController::class, 'updateCategory']);
    
    // Order Management
    Route::get('/admin/orders', [AdminController::class, 'orders']);
    Route::get('/admin/orders/{id}', [AdminController::class, 'orderDetail']);
    Route::patch('/admin/orders/{id}/status', [AdminController::class, 'updateOrderStatus']);
    Route::delete('/admin/orders/{id}', [AdminController::class, 'deleteOrder']);
    
    // Reports
    Route::get('/admin/sales-report', [AdminController::class, 'salesReport']);

    // Customer Concerns
    Route::get('/admin/customer-concerns', [CustomerConcernController::class, 'index']);
    Route::patch('/admin/customer-concerns/{customerConcern}', [CustomerConcernController::class, 'update']);
});
