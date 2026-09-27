<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CartController extends Controller
{
    private function userId(Request $request): int
    {
        return (int) ($request->user()->id ?? 0);
    }

    private function cartItemsForUser(int $userId)
    {
        return CartItem::with('product.category')
            ->where('user_id', $userId)
            ->latest()
            ->get();
    }

    private function transformCartItem(CartItem $item): array
    {
        $payload = $item->toArray();
        $product = $item->product;

        $payload['unit_price'] = (float) ($product->price ?? 0);
        $payload['subtotal'] = round($payload['unit_price'] * (int) ($item->quantity ?? 0), 2);
        $payload['available_stock'] = (int) ($product->stock ?? 0);
        $payload['is_available'] = (bool) ($product && $product->is_active && $product->listing_status === 'approved' && $product->stock > 0);

        return $payload;
    }

    private function buildSummary($items): array
    {
        $subtotal = 0.0;
        $count = 0;

        foreach ($items as $item) {
            $price = (float) ($item->product->price ?? 0);
            $quantity = (int) ($item->quantity ?? 0);
            $subtotal += $price * $quantity;
            $count += $quantity;
        }

        $subtotal = round($subtotal, 2);
        $tax = round($subtotal * 0.1, 2);
        $shipping = $items->isNotEmpty() ? 50.0 : 0.0;
        $total = round($subtotal + $tax + $shipping, 2);
        $transformedItems = $items->values()->map(function (CartItem $item) {
            return $this->transformCartItem($item);
        })->all();

        return [
            'items' => $transformedItems,
            'subtotal' => $subtotal,
            'tax' => $tax,
            'shipping' => $shipping,
            'total' => $total,
            'item_count' => $count,
            'count' => count($transformedItems),
        ];
    }

    public function index(Request $request)
    {
        $userId = $this->userId($request);
        if ($userId <= 0) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $items = $this->cartItemsForUser($userId);
        $summary = $this->buildSummary($items);

        return response()->json([
            'message' => 'Cart items retrieved successfully',
            'data' => $summary['items'],
            'summary' => $summary,
            'total' => $summary['total'],
            'count' => $summary['count'],
        ]);
    }

    public function summary(Request $request)
    {
        $userId = $this->userId($request);
        Log::info('Cart summary requested', [
            'user_id' => $userId,
            'request_user' => $request->user()?->id,
            'email' => $request->user()?->email,
        ]);

        if ($userId <= 0) {
            Log::warning('Cart summary failed - invalid user', ['user_id' => $userId]);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $items = $this->cartItemsForUser($userId);
        $summary = $this->buildSummary($items);

        Log::info('Cart summary returned', [
            'user_id' => $userId,
            'item_count' => count($summary['items'] ?? []),
        ]);

        return response()->json([
            'message' => 'Cart summary retrieved successfully',
            'data' => $summary,
        ]);
    }

    public function add(Request $request)
    {
        $userId = $this->userId($request);
        Log::info('Cart add attempt', [
            'user_id' => $userId,
            'request_user' => $request->user()?->id,
            'input' => $request->only(['product_id', 'quantity']),
        ]);

        if ($userId <= 0) {
            Log::warning('Cart add failed - invalid user', ['user_id' => $userId]);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'product_id' => 'required|integer|min:1',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::find((int) $validated['product_id']);
        if (!$product || !$product->is_active || $product->listing_status !== 'approved') {
            return response()->json(['message' => 'Product not found'], 404);
        }

        if ((int) $product->stock < 1) {
            return response()->json([
                'message' => 'Product is out of stock',
                'available' => (int) $product->stock,
            ], 400);
        }

        $existing = CartItem::where('user_id', $userId)
            ->where('product_id', $product->id)
            ->first();

        $requestedQuantity = (int) $validated['quantity'];
        $nextQuantity = $requestedQuantity + (int) ($existing->quantity ?? 0);

        if ($nextQuantity > (int) $product->stock) {
            return response()->json([
                'message' => 'Insufficient stock',
                'available' => (int) $product->stock,
            ], 400);
        }

        if ($existing) {
            $existing->update(['quantity' => $nextQuantity]);
            $item = $existing->fresh('product.category');
        } else {
            $item = CartItem::create([
                'user_id' => $userId,
                'product_id' => $product->id,
                'quantity' => $requestedQuantity,
            ])->load('product.category');
        }

        Log::info('Cart item added successfully', [
            'user_id' => $userId,
            'item_id' => $item->id,
            'product_id' => $product->id,
        ]);

        return response()->json([
            'message' => 'Item added to cart successfully',
            'data' => $this->transformCartItem($item),
            'summary' => $this->buildSummary($this->cartItemsForUser($userId)),
        ], 201);
    }

    public function update(Request $request, $cartItemId)
    {
        $userId = $this->userId($request);
        if ($userId <= 0) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $item = CartItem::with('product')->where('user_id', $userId)->find($cartItemId);
        if (!$item) {
            return response()->json(['message' => 'Cart item not found'], 404);
        }

        $product = $item->product;
        if (!$product || !$product->is_active || $product->listing_status !== 'approved') {
            return response()->json(['message' => 'Product not found'], 404);
        }

        if ((int) $validated['quantity'] > (int) $product->stock) {
            return response()->json([
                'message' => 'Insufficient stock',
                'available' => (int) $product->stock,
            ], 400);
        }

        $item->update(['quantity' => (int) $validated['quantity']]);

        return response()->json([
            'message' => 'Cart item updated successfully',
            'data' => $this->transformCartItem($item->fresh('product.category')),
            'summary' => $this->buildSummary($this->cartItemsForUser($userId)),
        ]);
    }

    public function remove(Request $request, $cartItemId)
    {
        $userId = $this->userId($request);
        if ($userId <= 0) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $item = CartItem::where('user_id', $userId)->find($cartItemId);
        if (!$item) {
            return response()->json(['message' => 'Cart item not found'], 404);
        }

        $item->delete();

        return response()->json([
            'message' => 'Cart item removed successfully',
            'data' => [],
            'summary' => $this->buildSummary($this->cartItemsForUser($userId)),
        ]);
    }

    public function clear(Request $request)
    {
        $userId = $this->userId($request);
        if ($userId <= 0) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        CartItem::where('user_id', $userId)->delete();

        return response()->json([
            'message' => 'Cart cleared successfully',
            'data' => [],
            'summary' => [
                'items' => [],
                'subtotal' => 0,
                'tax' => 0,
                'shipping' => 0,
                'total' => 0,
                'item_count' => 0,
                'count' => 0,
            ],
        ]);
    }
}
