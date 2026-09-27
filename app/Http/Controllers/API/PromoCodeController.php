<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PromoCode;
use Illuminate\Http\Request;

class PromoCodeController extends Controller
{
    public function validateForCheckout(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|integer|exists:products,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
        ]);

        $subtotal = $this->resolveSubtotal($request->user()->id, $validated['items'] ?? []);
        if ($subtotal <= 0) {
            return response()->json([
                'message' => 'Add items to your cart before applying a promo code.',
            ], 400);
        }

        $promoCode = PromoCode::query()
            ->where('code', strtoupper(trim((string) $validated['code'])))
            ->first();

        if (!$promoCode) {
            return response()->json(['message' => 'Promo code not found.'], 404);
        }

        $validationMessage = $promoCode->canBeUsedBy($user, $subtotal);
        if ($validationMessage !== null) {
            return response()->json(['message' => $validationMessage], 422);
        }

        $discountAmount = $promoCode->calculateDiscount($subtotal);

        return response()->json([
            'message' => 'Promo code applied successfully.',
            'data' => [
                'code' => $promoCode->code,
                'title' => $promoCode->title,
                'description' => $promoCode->description,
                'discount_type' => $promoCode->discount_type,
                'discount_value' => (float) $promoCode->discount_value,
                'discount_amount' => $discountAmount,
                'minimum_order_amount' => (float) $promoCode->minimum_order_amount,
                'expires_at' => optional($promoCode->expires_at)->toISOString(),
            ],
        ]);
    }

    private function resolveSubtotal(int $userId, array $requestItems = []): float
    {
        $cartItems = [];

        if (!empty($requestItems)) {
            $productIds = collect($requestItems)
                ->pluck('product_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();

            $products = Product::query()
                ->whereIn('id', $productIds)
                ->where('is_active', true)
                ->where('listing_status', 'approved')
                ->get()
                ->keyBy('id');

            foreach ($requestItems as $item) {
                $product = $products->get((int) ($item['product_id'] ?? 0));
                if (!$product) {
                    continue;
                }

                $cartItems[] = [
                    'product' => $product,
                    'quantity' => (int) ($item['quantity'] ?? 0),
                ];
            }
        } else {
            $cartItems = \App\Models\CartItem::with('product')
                ->where('user_id', $userId)
                ->get()
                ->all();
        }

        $subtotal = 0.0;
        foreach ($cartItems as $item) {
            $product = $item['product'] ?? $item->product ?? null;
            $quantity = (int) ($item['quantity'] ?? $item->quantity ?? 0);

            if (!$product || !$product->is_active || $product->listing_status !== 'approved' || $quantity <= 0) {
                continue;
            }

            $subtotal += (float) $product->price * $quantity;
        }

        return round($subtotal, 2);
    }
}
