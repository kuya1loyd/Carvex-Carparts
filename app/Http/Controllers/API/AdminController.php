<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CustomerConcern;
use App\Models\Order;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\User;
use App\Models\UserActivityLog;
use App\Notifications\AdminDirectMessageNotification;
use App\Notifications\PromoCodeNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function stats()
    {
        // Count revenue from all non-cancelled checkouts so admin totals update as soon as an order is placed.
        $totalRevenue = (float) Order::where('status', '!=', 'cancelled')->sum('total_amount');
        $lowStockProducts = Product::where('is_active', true)
            ->where('listing_status', 'approved')
            ->where('stock', '<=', 20)
            ->orderBy('stock')
            ->limit(10)
            ->get();
        $recentOrders = Order::with('user')
            ->latest()
            ->limit(10)
            ->get();
        $recentUsers = User::query()
            ->withCount('orders')
            ->latest()
            ->limit(10)
            ->get(['id', 'name', 'email', 'role', 'is_active', 'created_at']);
        $recentConcerns = CustomerConcern::query()
            ->latest()
            ->limit(10)
            ->get(['id', 'user_id', 'name', 'email', 'subject', 'status', 'created_at']);
        $recentListingActivity = UserActivityLog::query()
            ->where('type', 'seller')
            ->latest()
            ->limit(10)
            ->get();

        $recentActivities = collect()
            ->concat($recentOrders->map(static function (Order $order) {
                $createdAt = optional($order->created_at);

                return [
                    'type' => 'order',
                    'id' => 'order-' . $order->id,
                    'title' => 'New order ' . ($order->order_number ?: ('#' . $order->id)),
                    'description' => $order->user?->name ? ('Placed by ' . $order->user->name) : ('Placed by customer #' . $order->user_id),
                    'status' => $order->status,
                    'created_at' => $createdAt?->toISOString(),
                    'created_at_ts' => $createdAt?->timestamp ?? 0,
                ];
            }))
            ->concat($recentUsers->map(static function (User $user) {
                $createdAt = optional($user->created_at);

                return [
                    'type' => 'user',
                    'id' => 'user-' . $user->id,
                    'title' => 'New user account',
                    'description' => $user->name . ' (' . $user->email . ')',
                    'status' => $user->is_active ? 'active' : 'inactive',
                    'created_at' => $createdAt?->toISOString(),
                    'created_at_ts' => $createdAt?->timestamp ?? 0,
                ];
            }))
            ->concat($recentConcerns->map(static function (CustomerConcern $concern) {
                $createdAt = optional($concern->created_at);

                return [
                    'type' => 'concern',
                    'id' => 'concern-' . $concern->id,
                    'title' => 'Customer concern submitted',
                    'description' => ($concern->name ?: 'Customer') . ': ' . (string) ($concern->subject ?: 'General concern'),
                    'status' => $concern->status,
                    'created_at' => $createdAt?->toISOString(),
                    'created_at_ts' => $createdAt?->timestamp ?? 0,
                ];
            }))
            ->concat($recentListingActivity->map(static function (UserActivityLog $activity) {
                $createdAt = optional($activity->created_at);

                return [
                    'type' => 'seller',
                    'id' => 'activity-' . $activity->id,
                    'title' => Str::headline(str_replace('_', ' ', $activity->action)),
                    'description' => ($activity->actor_name ?: 'Seller') . ': ' . $activity->description,
                    'status' => data_get($activity->metadata, 'listing_status'),
                    'created_at' => $createdAt?->toISOString(),
                    'created_at_ts' => $createdAt?->timestamp ?? 0,
                ];
            }))
            ->sortByDesc('created_at_ts')
            ->take(20)
            ->map(static function (array $activity) {
                unset($activity['created_at_ts']);
                return $activity;
            })
            ->values();

        return response()->json([
            'message' => 'Admin stats retrieved successfully',
            'data' => [
                'total_revenue' => $totalRevenue,
                'total_orders' => Order::count(),
                'total_products' => Product::where('is_active', true)->where('listing_status', 'approved')->count(),
                'total_users' => User::count(),
                'total_customer_concerns' => CustomerConcern::count(),
                'pending_customer_concerns' => CustomerConcern::where('status', 'pending')->count(),
                'pending_seller_listings' => Product::whereNotNull('seller_id')->where('listing_status', 'pending')->count(),
                'low_stock_count' => Product::where('is_active', true)->where('listing_status', 'approved')->where('stock', '>', 0)->where('stock', '<=', 10)->count(),
                'low_stock_products' => $lowStockProducts,
                'recent_orders' => $recentOrders,
                'recent_users' => $recentUsers,
                'recent_concerns' => $recentConcerns,
                'recent_activities' => $recentActivities,
            ],
        ]);
    }

    public function users(Request $request)
    {
        $query = User::query()
            ->where('role', '!=', 'admin')
            ->withCount('orders')
            ->withCount('listings')
            ->addSelect([
                'orders_total_amount' => Order::query()
                    ->selectRaw('COALESCE(SUM(total_amount), 0)')
                    ->whereColumn('user_id', 'users.id')
                    ->where('status', '!=', 'cancelled'),
                'last_order_at' => Order::query()
                    ->select('created_at')
                    ->whereColumn('user_id', 'users.id')
                    ->latest()
                    ->limit(1),
            ])
            ->latest();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'like', '%' . $q . '%')
                    ->orWhere('email', 'like', '%' . $q . '%')
                    ->orWhere('phone', 'like', '%' . $q . '%')
                    ->orWhere('id', 'like', '%' . $q . '%');
            });
        }

        if (filter_var($request->input('count_only', false), FILTER_VALIDATE_BOOLEAN)) {
            return response()->json([
                'message' => 'Users count retrieved successfully',
                'data' => [
                    'data' => [],
                    'total' => $query->count(),
                    'per_page' => 0,
                    'current_page' => 1,
                    'last_page' => 1,
                ],
            ]);
        }

        $perPage = max(1, min(300, (int) $request->input('per_page', 300)));
        $rows = $query->paginate($perPage);

        return response()->json([
            'message' => 'Users retrieved successfully',
            'data' => [
                'data' => $rows->items(),
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
        ]);
    }

    public function activity(Request $request)
    {
        $sellerActivities = DB::table('user_activity_logs')->selectRaw(
            "'seller' as type, action, actor_name, actor_email, subject_name, description, metadata, created_at, id as source_id, 'seller' as source"
        );

        $customerActivities = DB::table('users')
            ->where('role', 'customer')
            ->selectRaw(
                "'customer' as type, 'account_created' as action, name as actor_name, email as actor_email, name as subject_name, 'Created a customer account' as description, NULL as metadata, created_at, id as source_id, 'customer' as source"
            );

        $orderActivities = DB::table('orders')
            ->leftJoin('users as activity_users', 'orders.user_id', '=', 'activity_users.id')
            ->selectRaw(
                "'order' as type, 'order_placed' as action, COALESCE(activity_users.name, 'Customer') as actor_name, activity_users.email as actor_email, orders.order_number as subject_name, 'Placed an order' as description, NULL as metadata, orders.created_at, orders.id as source_id, 'order' as source"
            );

        $concernActivities = DB::table('customer_concerns')
            ->leftJoin('users as activity_users', 'customer_concerns.user_id', '=', 'activity_users.id')
            ->selectRaw(
                "'concern' as type, 'support_request' as action, COALESCE(activity_users.name, customer_concerns.name, 'Customer') as actor_name, COALESCE(activity_users.email, customer_concerns.email) as actor_email, customer_concerns.subject as subject_name, 'Submitted a support request' as description, NULL as metadata, customer_concerns.created_at, customer_concerns.id as source_id, 'concern' as source"
            );

        $activityStream = $sellerActivities
            ->unionAll($customerActivities)
            ->unionAll($orderActivities)
            ->unionAll($concernActivities);

        $query = DB::query()->fromSub($activityStream, 'activity_stream');

        $type = (string) $request->query('type', '');
        if ($type === 'customer') {
            $query->whereIn('type', ['customer', 'order', 'concern']);
        } elseif ($type === 'support') {
            $query->where('type', 'concern');
        } elseif (in_array($type, ['seller', 'order', 'concern'], true)) {
            $query->where('type', $type);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($builder) use ($search) {
                $like = '%' . $search . '%';
                $builder->where('actor_name', 'like', $like)
                    ->orWhere('actor_email', 'like', $like)
                    ->orWhere('subject_name', 'like', $like)
                    ->orWhere('description', 'like', $like);
            });
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 30)));
        $rows = $query
            ->orderByDesc('created_at')
            ->orderByDesc('source_id')
            ->paginate($perPage);

        $items = collect($rows->items())->map(static function ($row) {
            $metadata = $row->metadata;
            if (is_string($metadata)) {
                $metadata = json_decode($metadata, true) ?: null;
            }

            return [
                'id' => $row->source . '-' . $row->source_id,
                'type' => $row->type,
                'action' => $row->action,
                'description' => $row->description,
                'actor_name' => $row->actor_name,
                'actor_email' => $row->actor_email,
                'subject_name' => $row->subject_name,
                'created_at' => Carbon::parse($row->created_at)->toISOString(),
                'metadata' => $metadata,
            ];
        })->values();

        return response()->json([
            'message' => 'Activity retrieved successfully.',
            'data' => [
                'data' => $items,
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function reviewSellerListing(Request $request, int $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'review_note' => 'nullable|string|max:1000',
        ]);

        $product = Product::query()->whereNotNull('seller_id')->find($id);
        if (!$product) {
            return response()->json(['message' => 'Seller listing not found.'], 404);
        }

        $product->forceFill([
            'listing_status' => $validated['status'],
            'is_active' => $validated['status'] === 'approved',
            'review_note' => $validated['status'] === 'rejected'
                ? trim((string) ($validated['review_note'] ?? '')) ?: null
                : null,
        ])->save();

        $actor = $request->user();
        $action = $validated['status'] === 'approved' ? 'listing_approved' : 'listing_rejected';
        $description = $validated['status'] === 'approved'
            ? 'Approved the listing for the public shop.'
            : 'Rejected the listing.';

        UserActivityLog::create([
            'user_id' => $actor?->id,
            'product_id' => $product->id,
            'type' => 'seller',
            'action' => $action,
            'actor_name' => $actor?->name,
            'actor_email' => $actor?->email,
            'subject_name' => $product->name,
            'description' => $description,
            'metadata' => [
                'listing_id' => $product->id,
                'seller_id' => $product->seller_id,
                'listing_status' => $product->listing_status,
                'review_note' => $product->review_note,
            ],
        ]);

        return response()->json([
            'message' => $validated['status'] === 'approved' ? 'Listing approved.' : 'Listing rejected.',
            'data' => $product->fresh(['category', 'seller:id,name,email']),
        ]);
    }

    public function deleteUser(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer',
        ]);

        $target = User::find($validated['user_id']);

        if (!$target) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ((int) $target->id === (int) optional($request->user())->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 400);
        }

        $target->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function toggleUser($id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->role === 'admin') {
            return response()->json(['message' => 'Admin users cannot be disabled.'], 400);
        }

        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'message' => 'User status updated successfully',
            'data' => $user->fresh(),
        ]);
    }

    public function notifyUser(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:120',
            'message' => 'required|string|min:5|max:2000',
            'link' => 'nullable|string|max:255',
        ]);

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->role === 'admin') {
            return response()->json(['message' => 'Notifications can only be sent to customer accounts.'], 400);
        }

        $user->notify(new AdminDirectMessageNotification(
            $validated['title'],
            $validated['message'],
            $validated['link'] ?? '/dashboard'
        ));

        return response()->json([
            'message' => 'Notification sent successfully',
            'data' => [
                'user_id' => $user->id,
                'title' => $validated['title'],
            ],
        ]);
    }

    public function sendPromoCode(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:120',
            'message' => 'nullable|string|max:500',
            'discount_type' => 'required|in:percentage,fixed',
            'discount_value' => 'required|numeric|min:1',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'expires_in_days' => 'nullable|integer|min:1|max:365',
        ]);

        if ($validated['discount_type'] === 'percentage' && (float) $validated['discount_value'] > 100) {
            return response()->json(['message' => 'Percentage promo codes cannot exceed 100%.'], 422);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->role === 'admin') {
            return response()->json(['message' => 'Promo codes can only be sent to customer accounts.'], 400);
        }

        $promoCode = PromoCode::create([
            'code' => PromoCode::generateUniqueCode(),
            'title' => trim((string) ($validated['title'] ?? '')) ?: 'Exclusive promo from CarVex',
            'description' => trim((string) ($validated['message'] ?? '')) ?: null,
            'discount_type' => $validated['discount_type'],
            'discount_value' => round((float) $validated['discount_value'], 2),
            'minimum_order_amount' => round((float) ($validated['minimum_order_amount'] ?? 0), 2),
            'max_uses' => 1,
            'used_count' => 0,
            'assigned_user_id' => $user->id,
            'created_by_user_id' => optional($request->user())->id,
            'is_active' => true,
            'sent_at' => now(),
            'expires_at' => now()->addDays((int) ($validated['expires_in_days'] ?? 30))->endOfDay(),
        ]);

        $user->notify(new PromoCodeNotification(
            $promoCode,
            $promoCode->title,
            $promoCode->description
        ));

        return response()->json([
            'message' => 'Promo code generated and sent successfully',
            'data' => [
                'user_id' => $user->id,
                'code' => $promoCode->code,
                'discount_type' => $promoCode->discount_type,
                'discount_value' => (float) $promoCode->discount_value,
                'expires_at' => optional($promoCode->expires_at)->toISOString(),
            ],
        ]);
    }

    public function products(Request $request)
    {
        $query = Product::with(['category', 'seller:id,name,email'])->latest();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'like', '%' . $q . '%')
                    ->orWhere('brand', 'like', '%' . $q . '%')
                    ->orWhere('slug', 'like', '%' . $q . '%')
                    ->orWhere('sku', 'like', '%' . $q . '%')
                    ->orWhere('supplier', 'like', '%' . $q . '%')
                    ->orWhereHas('category', function ($categoryQuery) use ($q) {
                        $categoryQuery->where('name', 'like', '%' . $q . '%');
                    });
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->input('category_id'));
        }

        $status = (string) $request->query('status', '');
        if (in_array($status, ['pending', 'approved', 'rejected', 'archived'], true)) {
            $query->where('listing_status', $status);
        }

        if (filter_var($request->input('count_only', false), FILTER_VALIDATE_BOOLEAN)) {
            return response()->json([
                'message' => 'Products count retrieved successfully',
                'data' => [
                    'data' => [],
                    'total' => $query->count(),
                    'per_page' => 0,
                    'current_page' => 1,
                    'last_page' => 1,
                ],
            ]);
        }

        $perPage = max(1, min(300, (int) $request->input('per_page', 300)));
        $rows = $query->paginate($perPage);

        return response()->json([
            'message' => 'Products retrieved successfully',
            'data' => [
                'data' => $rows->items(),
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
        ]);
    }

    public function createProduct(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:products,slug',
            'sku' => 'nullable|string|max:255|unique:products,sku',
            'brand' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'vehicle_compatibility' => 'nullable|string|max:255',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120',
            'is_active' => 'sometimes|boolean',
            'is_hot_deal' => 'sometimes|boolean',
            'is_premium' => 'sometimes|boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug((string) $validated['name']) . '-' . Str::lower(Str::random(4));
        }

        if (empty($validated['sku'])) {
            unset($validated['sku']);
        } else {
            $validated['sku'] = Str::upper(trim((string) $validated['sku']));
        }

        // Handle image uploads
        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $filename = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
                $image->move(public_path('images'), $filename);
                $imagePaths[] = '/images/' . $filename;
            }
        }
        $validated['images'] = $imagePaths;

        $product = Product::create($validated);

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product->load('category'),
        ], 201);
    }

    public function updateProduct(Request $request, $id)
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $validated = $request->validate([
            'category_id' => 'sometimes|exists:categories,id',
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:products,slug,' . $product->id,
            'sku' => 'sometimes|nullable|string|max:255|unique:products,sku,' . $product->id,
            'brand' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'price' => 'sometimes|numeric|min:0',
            'stock' => 'sometimes|integer|min:0',
            'vehicle_compatibility' => 'nullable|string|max:255',
            'images' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'is_hot_deal' => 'sometimes|boolean',
            'is_premium' => 'sometimes|boolean',
        ]);

        if (array_key_exists('name', $validated) && empty($validated['slug']) && empty($product->slug)) {
            $validated['slug'] = Str::slug((string) $validated['name']) . '-' . Str::lower(Str::random(4));
        }

        if (array_key_exists('sku', $validated)) {
            $validated['sku'] = filled($validated['sku'])
                ? Str::upper(trim((string) $validated['sku']))
                : Product::generateUniqueSku($validated['name'] ?? $product->name, $product->id);
        }

        $product->fill($validated)->save();

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $product->fresh('category'),
        ]);
    }

    public function deleteProduct($id)
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        try {
            $product->delete();
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Product cannot be deleted because it is referenced by existing orders.',
            ], 400);
        }

        return response()->json(['message' => 'Product deleted successfully']);
    }

    public function createCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string',
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => Str::slug((string) $validated['name']),
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Category created successfully',
            'data' => $category,
        ], 201);
    }

    public function updateCategory(Request $request, $id)
    {
        $category = Category::find($id);
        if (!$category) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
            'description' => 'nullable|string',
        ]);

        $category->update([
            'name' => $validated['name'],
            'slug' => Str::slug((string) $validated['name']),
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Category updated successfully',
            'data' => $category,
        ]);
    }

    public function orders(Request $request)
    {
        $countOnly = filter_var($request->input('count_only', false), FILTER_VALIDATE_BOOLEAN);

        if ($countOnly) {
            return response()->json([
                'message' => 'Orders count retrieved successfully',
                'data' => [
                    'data' => [],
                    'total' => Order::count(),
                    'per_page' => 0,
                    'current_page' => 1,
                    'last_page' => 1,
                ],
            ]);
        }

        $includeItems = filter_var($request->input('include_items', true), FILTER_VALIDATE_BOOLEAN);
        $includeUsers = filter_var($request->input('include_users', true), FILTER_VALIDATE_BOOLEAN);

        $with = [];
        if ($includeUsers) {
            $with[] = 'user';
        }
        if ($includeItems) {
            $with[] = 'items.product';
        }

        $query = Order::query()->with($with)->latest();

        if ($request->filled('status')) {
            $query->where('status', (string) $request->input('status'));
        }

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($builder) use ($q) {
                $builder->where('order_number', 'like', '%' . $q . '%')
                    ->orWhere('tracking_number', 'like', '%' . $q . '%')
                    ->orWhere('status', 'like', '%' . $q . '%')
                    ->orWhereHas('user', function ($userQuery) use ($q) {
                        $userQuery->where('name', 'like', '%' . $q . '%')
                            ->orWhere('email', 'like', '%' . $q . '%');
                    });
            });
        }

        $perPage = max(1, min(300, (int) $request->input('per_page', 50)));
        $rows = $query->paginate($perPage);

        return response()->json([
            'message' => 'Orders retrieved successfully',
            'data' => [
                'data' => $rows->items(),
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
        ]);
    }

    public function deleteOrder($id)
    {
        $order = Order::find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $order->delete();

        return response()->json(['message' => 'Order deleted successfully']);
    }

    public function orderDetail($id)
    {
        $order = Order::with(['user', 'items.product'])
            ->where(function ($builder) use ($id) {
                $builder->where('id', $id)
                    ->orWhere('order_number', (string) $id);
            })
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        return response()->json([
            'message' => 'Order retrieved successfully',
            'data' => $order,
        ]);
    }

    public function updateOrderStatus(Request $request, $id)
    {
        $order = Order::find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|in:processing,shipped,delivered,cancelled',
            'tracking_number' => 'nullable|string|max:255',
        ]);

        // Auto-generate tracking number if shipping and no tracking number exists
        $trackingNumber = $validated['tracking_number'] ?? $order->tracking_number;
        if ($validated['status'] === 'shipped' && empty($trackingNumber)) {
            // Generate JRS tracking number like J&T format: JRS-XXXX-XXXX-XX
            $random1 = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $random2 = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $random3 = str_pad(random_int(1, 99), 2, '0', STR_PAD_LEFT);
            $trackingNumber = 'JRS-' . $random1 . '-' . $random2 . '-' . $random3;
        }

        $payload = [
            'status' => $validated['status'],
            'tracking_number' => $trackingNumber,
        ];

        if ($validated['status'] === 'shipped' && !$order->shipped_at) {
            $payload['shipped_at'] = now();
        }

        if ($validated['status'] === 'delivered' && !$order->delivered_at) {
            $payload['delivered_at'] = now();
            if ($order->payment_status === 'pending') {
                $payload['payment_status'] = 'completed';
                $payload['paid_at'] = now();
            }
        }

        $order->update($payload);

        return response()->json([
            'message' => 'Order status updated successfully',
            'data' => $order->fresh(['user', 'items.product']),
        ]);
    }

    public function salesReport(Request $request)
    {
        $from = $request->input('from') ? Carbon::parse((string) $request->input('from'))->startOfDay() : now()->subDays(30)->startOfDay();
        $to = $request->input('to') ? Carbon::parse((string) $request->input('to'))->endOfDay() : now()->endOfDay();

        $orders = Order::whereBetween('created_at', [$from, $to]);

        $summary = [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_orders' => (clone $orders)->count(),
            'completed_orders' => (clone $orders)->where('payment_status', 'completed')->count(),
            'cancelled_orders' => (clone $orders)->where('status', 'cancelled')->count(),
            'total_revenue' => (float) (clone $orders)->where('status', '!=', 'cancelled')->sum('total_amount'),
        ];

        $daily = Order::selectRaw('DATE(created_at) as day, COUNT(*) as orders, SUM(total_amount) as gross_total')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('day')
            ->get();

        return response()->json([
            'message' => 'Sales report generated successfully',
            'data' => [
                'summary' => $summary,
                'daily' => $daily,
            ],
        ]);
    }

    /**
     * Update admin profile
     */
    public function updateProfile(Request $request)
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'profile_picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            // Delete old profile picture if exists
            if ($user->profile_picture && file_exists(public_path($user->profile_picture))) {
                unlink(public_path($user->profile_picture));
            }
            
            $filename = 'profile_' . $user->id . '_' . time() . '.' . $request->file('profile_picture')->getClientOriginalExtension();
            $request->file('profile_picture')->move(public_path('images/profiles'), $filename);
            $validated['profile_picture'] = '/images/profiles/' . $filename;
        }

        // Update name if first_name or last_name provided
        if (isset($validated['first_name']) || isset($validated['last_name'])) {
            $validated['name'] = ($validated['first_name'] ?? $user->first_name ?? '') . ' ' . ($validated['last_name'] ?? $user->last_name ?? '');
            $validated['name'] = trim($validated['name']);
        }

        /** @var \App\Models\User $user */
        $user->fill($validated)->save(); /** @noinspection PhpUndefinedMethodInspection */

        return response()->json([
            'message' => 'Profile updated successfully',
            'data' => $user,
        ]);
    }
}
