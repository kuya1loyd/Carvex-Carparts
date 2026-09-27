<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\PromoCode;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OrderController extends Controller
{
    private function transformOrder(Order $order): array
    {
        $payload = $order->toArray();
        $payload['subtotal_amount'] = round(
            (float) $order->total_amount - (float) $order->tax_amount - (float) $order->shipping_amount,
            2
        );
        $payload['items_count'] = (int) $order->items->sum('quantity');

        return $payload;
    }

    private function orderQueryForUser(int $userId)
    {
        return Order::with(['items.product.category'])
            ->where('user_id', $userId)
            ->latest();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = $this->orderQueryForUser((int) $user->id);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->input('status'));
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 10)));
        $orders = $query->paginate($perPage);
        $orderData = collect($orders->items())->map(function (Order $order) {
            return $this->transformOrder($order);
        })->values()->all();

        return response()->json([
            'message' => 'Orders retrieved successfully',
            'data' => [
                'data' => $orderData,
                'orders' => $orderData,
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
            ],
        ]);
    }

    public function myOrders(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $orders = Order::where('user_id', $user->id)
            ->with(['items.product'])
            ->latest()
            ->get();

        return response()->json([
            'data' => $orders->map(fn($order) => $this->transformOrder($order)),
        ]);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $order = $this->orderQueryForUser((int) $user->id)
            ->where(function ($query) use ($id) {
                $query->where('id', $id)
                    ->orWhere('order_number', (string) $id);
            })
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        return response()->json([
            'message' => 'Order retrieved successfully',
            'data' => $this->transformOrder($order),
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'payment_method' => 'required|in:cod,gcash,card,bank_transfer',
            'promo_code' => 'nullable|string|max:50',
            'shipping_address' => 'required|string|max:1000',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_province' => 'nullable|string|max:255',
            'shipping_region' => 'nullable|string|max:255',
            'shipping_zip' => 'nullable|string|max:20',
            'notes' => 'nullable|string|max:2000',
            'payment_details' => 'nullable|array',
            'payment_details.method' => 'nullable|string|max:50',
            'payment_details.account_name' => 'nullable|string|max:255',
            'payment_details.mobile_number' => 'nullable|string|max:30',
            'payment_details.reference_number' => 'nullable|string|max:255',
            'payment_details.bank_name' => 'nullable|string|max:255',
            'payment_details.cardholder_name' => 'nullable|string|max:255',
            'payment_details.card_last4' => 'nullable|string|max:8',
            'payment_details.expiry' => 'nullable|string|max:10',
        ]);

        $cartItems = CartItem::with('product')
            ->where('user_id', $user->id)
            ->get();

        // If items passed in request (for localStorage cart sync), use those
        $requestItems = $request->input('items', []);
        if ($cartItems->isEmpty() && !empty($requestItems) && is_array($requestItems)) {
            Log::info('Using items from request instead of database', [
                'user_id' => $user->id,
                'item_count' => count($requestItems),
            ]);

            // Create temporary cart items from request
            foreach ($requestItems as $reqItem) {
                $product = Product::find($reqItem['product_id'] ?? 0);
                if ($product) {
                    $cartItems->push(new CartItem([
                        'user_id' => $user->id,
                        'product_id' => $product->id,
                        'quantity' => $reqItem['quantity'] ?? 1,
                        'product' => $product,
                    ]));
                }
            }
        }

        Log::info('Order creation attempt', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'cart_count' => $cartItems->count(),
        ]);

        if ($cartItems->isEmpty()) {
            // Check if there are any cart items for this user at all (without product relation)
            $rawCount = CartItem::where('user_id', $user->id)->count();
            Log::warning('Cart is empty for user', [
                'user_id' => $user->id,
                'raw_count' => $rawCount,
            ]);

            return response()->json([
                'message' => 'Cart is empty. Please add items to your cart before checkout.',
                'debug' => ['user_id' => $user->id, 'raw_count' => $rawCount],
            ], 400);
        }

        $subtotal = 0.0;
        foreach ($cartItems as $item) {
            $product = $item->product;
            if (!$product || !$product->is_active || $product->listing_status !== 'approved') {
                return response()->json([
                    'message' => 'A product in your cart is no longer available.',
                ], 400);
            }

            $price = (float) $product->price;
            $subtotal += $price * (int) $item->quantity;
        }

        $subtotal = round($subtotal, 2);
        $normalizedPromoCode = strtoupper(trim((string) ($validated['promo_code'] ?? '')));
        $promoCodeRecord = null;
        $discountAmount = 0.0;

        if ($normalizedPromoCode !== '') {
            $promoCodeRecord = PromoCode::query()
                ->where('code', $normalizedPromoCode)
                ->first();

            if (!$promoCodeRecord) {
                return response()->json(['message' => 'Promo code not found.'], 404);
            }

            $promoError = $promoCodeRecord->canBeUsedBy($user, $subtotal);
            if ($promoError !== null) {
                return response()->json(['message' => $promoError], 422);
            }

            $discountAmount = round($promoCodeRecord->calculateDiscount($subtotal), 2);
        }

        $discountedSubtotal = max(0, round($subtotal - $discountAmount, 2));
        $tax = round($discountedSubtotal * 0.10, 2);
        $shipping = $cartItems->isNotEmpty() ? 50.00 : 0.00;
        $total = round($discountedSubtotal + $tax + $shipping, 2);

        try {
            $order = DB::transaction(function () use ($user, $validated, $cartItems, $tax, $shipping, $total, $normalizedPromoCode, $discountAmount) {
                $productIds = $cartItems->pluck('product_id')->all();
                $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');
                $promoCodeRecord = null;

                foreach ($cartItems as $item) {
                    $product = $products->get((int) $item->product_id);
                    if (!$product || !$product->is_active || $product->listing_status !== 'approved') {
                        throw new HttpException(400, 'A product in your cart is no longer available.');
                    }

                    if ((int) $product->stock < (int) $item->quantity) {
                        throw new HttpException(400, 'Insufficient stock for ' . $product->name);
                    }
                }

                foreach ($cartItems as $item) {
                    $product = $products->get((int) $item->product_id);
                    $product->decrement('stock', (int) $item->quantity);
                }

                if ($normalizedPromoCode !== '') {
                    $promoCodeRecord = PromoCode::query()
                        ->where('code', $normalizedPromoCode)
                        ->lockForUpdate()
                        ->first();

                    if (!$promoCodeRecord) {
                        throw new HttpException(404, 'Promo code not found.');
                    }

                    $promoError = $promoCodeRecord->canBeUsedBy($user, (float) collect($cartItems)->sum(function ($item) {
                        return (float) ($item->product->price ?? 0) * (int) $item->quantity;
                    }));

                    if ($promoError !== null) {
                        throw new HttpException(422, $promoError);
                    }
                }

                $paymentStatus = $validated['payment_method'] === 'cod' ? 'pending' : 'pending';

                $order = Order::create([
                    'user_id' => $user->id,
                    'order_number' => 'ORD-' . now()->format('YmdHis') . strtoupper(Str::random(4)),
                    'status' => 'processing',
                    'payment_method' => $validated['payment_method'],
                    'payment_status' => $paymentStatus,
                    'promo_code' => $normalizedPromoCode !== '' ? $normalizedPromoCode : null,
                    'payment_details' => $validated['payment_details'] ?? null,
                    'total_amount' => $total,
                    'tax_amount' => $tax,
                    'shipping_amount' => $shipping,
                    'discount_amount' => $discountAmount,
                    'shipping_address' => $validated['shipping_address'],
                    'shipping_city' => $validated['shipping_city'] ?? null,
                    'shipping_province' => $validated['shipping_province'] ?? null,
                    'shipping_region' => $validated['shipping_region'] ?? null,
                    'shipping_zip' => $validated['shipping_zip'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                ]);

                $orderItems = [];
                foreach ($cartItems as $item) {
                    $unitPrice = (float) ($item->product->price ?? 0);
                    $quantity = (int) $item->quantity;
                    $orderItems[] = [
                        'order_id' => $order->id,
                        'product_id' => $item->product_id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => round($unitPrice * $quantity, 2),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                OrderItem::insert($orderItems);
                CartItem::where('user_id', $user->id)->delete();

                if ($promoCodeRecord) {
                    $newUsedCount = (int) $promoCodeRecord->used_count + 1;
                    $promoCodeRecord->forceFill([
                        'used_count' => $newUsedCount,
                        'is_active' => $newUsedCount < (int) $promoCodeRecord->max_uses,
                    ])->save();
                }

                return $order->load(['items.product.category']);
            });
        } catch (HttpException $exception) {
            $response = ['message' => $exception->getMessage()];

            if (str_starts_with($exception->getMessage(), 'Insufficient stock for ')) {
                $productName = str_replace('Insufficient stock for ', '', $exception->getMessage());
                $product = Product::where('name', $productName)->first();
                if ($product) {
                    $response['available'] = (int) $product->stock;
                }
            }

            return response()->json($response, $exception->getStatusCode());
        }

        $user->notify(new OrderPlacedNotification($order));

        Log::info('Order created successfully', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'cart_count' => $cartItems->count(),
        ]);

        return response()->json([
            'message' => 'Order created successfully',
            'data' => $this->transformOrder($order),
        ], 201);
    }

    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $order = Order::with('items')
            ->where('user_id', $user->id)
            ->find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        if (!in_array($order->status, ['pending', 'processing'], true)) {
            return response()->json(['message' => 'Only pending or processing orders can be cancelled.'], 400);
        }

        DB::transaction(function () use ($order) {
            foreach ($order->items as $item) {
                Product::where('id', $item->product_id)->increment('stock', (int) $item->quantity);
            }

            $order->update([
                'status' => 'cancelled',
                'payment_status' => $order->payment_status === 'completed' ? 'failed' : $order->payment_status,
            ]);
        });

        return response()->json([
            'message' => 'Order cancelled successfully',
            'data' => $this->transformOrder($order->fresh(['items.product.category'])),
        ]);
    }

    public function updatePaymentStatus(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,completed,failed',
            'transaction_id' => 'nullable|string|max:255',
        ]);

        $order = Order::where('user_id', $user->id)->find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $payload = [
            'payment_status' => $validated['status'],
        ];

        if ($validated['status'] === 'completed' && !$order->paid_at) {
            $payload['paid_at'] = now();
        }

        if ($validated['status'] !== 'completed') {
            $payload['paid_at'] = null;
        }

        if (!empty($validated['transaction_id'])) {
            $paymentDetails = (array) ($order->payment_details ?? []);
            $paymentDetails['transaction_id'] = $validated['transaction_id'];
            $payload['payment_details'] = $paymentDetails;

            $note = trim((string) $order->notes);
            $append = 'Transaction ID: ' . $validated['transaction_id'];
            if (!str_contains($note, $append)) {
                $payload['notes'] = $note === '' ? $append : ($note . PHP_EOL . $append);
            }
        }

        $order->update($payload);

        return response()->json([
            'message' => 'Payment status updated successfully',
            'data' => $this->transformOrder($order->fresh(['items.product.category'])),
        ]);
    }
}
