<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    private function transformProduct(Product $product): array
    {
        $payload = $product->toArray();
        unset($payload['seller_id'], $payload['listing_status'], $payload['review_note']);
        $payload['in_stock'] = (int) $product->stock > 0;
        $payload['low_stock'] = (int) $product->stock > 0 && (int) $product->stock <= 5;

        return $payload;
    }

    private function productQuery(Request $request, bool $activeOnly = true)
    {
        $query = Product::query()->with('category');

        if ($activeOnly) {
            $query->where('is_active', true)->where('listing_status', 'approved');
        }

        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', '%' . $search . '%')
                    ->orWhere('brand', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('vehicle_compatibility', 'like', '%' . $search . '%')
                    ->orWhere('slug', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->input('category_id'));
        }

        if ($request->filled('brand')) {
            $query->where('brand', 'like', '%' . trim((string) $request->input('brand')) . '%');
        }

        if ($request->filled('price_min')) {
            $query->where('price', '>=', (float) $request->input('price_min'));
        }

        if ($request->filled('price_max')) {
            $query->where('price', '<=', (float) $request->input('price_max'));
        }

        if ($request->filled('vehicle_compatibility')) {
            $query->where('vehicle_compatibility', 'like', '%' . trim((string) $request->input('vehicle_compatibility')) . '%');
        }

        if ($request->boolean('in_stock')) {
            $query->where('stock', '>', 0);
        }

        $allowedSortBy = ['created_at', 'price', 'name', 'stock'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortBy, true) ? $request->input('sort_by') : 'created_at';
        $sortOrder = $request->input('sort_order') === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sortBy, $sortOrder);
    }

    public function index(Request $request)
    {
        $perPage = max(1, min(1000, (int) $request->input('per_page', 24)));
        $products = $this->productQuery($request)->paginate($perPage);
        $productData = collect($products->items())->map(function (Product $product) {
            return $this->transformProduct($product);
        })->values()->all();

        return response()->json([
            'message' => 'Products retrieved successfully',
            'data' => [
                'data' => $productData,
                'products' => $productData,
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
        ]);
    }

    public function featured()
    {
        $products = Product::with('category')
            ->where('is_active', true)
            ->where('listing_status', 'approved')
            ->latest()
            ->limit(12)
            ->get()
            ->map(function (Product $product) {
                return $this->transformProduct($product);
            })
            ->values();

        return response()->json([
            'message' => 'Featured products retrieved successfully',
            'data' => $products,
        ]);
    }

    public function hotDeals()
    {
        $products = Product::with('category')
            ->where('is_active', true)
            ->where('listing_status', 'approved')
            ->where('is_hot_deal', true)
            ->latest()
            ->limit(12)
            ->get()
            ->map(function (Product $product) {
                return $this->transformProduct($product);
            })
            ->values();

        return response()->json([
            'message' => 'Hot deal products retrieved successfully',
            'data' => $products,
        ]);
    }

    public function premium()
    {
        $products = Product::with('category')
            ->where('is_active', true)
            ->where('listing_status', 'approved')
            ->where('is_premium', true)
            ->latest()
            ->limit(12)
            ->get()
            ->map(function (Product $product) {
                return $this->transformProduct($product);
            })
            ->values();

        return response()->json([
            'message' => 'Premium products retrieved successfully',
            'data' => $products,
        ]);
    }

    public function show($id)
    {
        $product = Product::with('category')
            ->where(function ($query) use ($id) {
                $query->where('id', $id)
                    ->orWhere('slug', (string) $id);
            })
            ->where('is_active', true)
            ->where('listing_status', 'approved')
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        return response()->json([
            'message' => 'Product retrieved successfully',
            'data' => $this->transformProduct($product),
        ]);
    }

    public function byCategory($categoryId, Request $request)
    {
        $category = Category::find($categoryId);
        if (!$category) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        $perPage = max(1, min(1000, (int) $request->input('per_page', 24)));
        $products = Product::with('category')
            ->where('category_id', $category->id)
            ->where('is_active', true)
            ->where('listing_status', 'approved')
            ->latest()
            ->paginate($perPage);

        $productData = collect($products->items())->map(function (Product $product) {
            return $this->transformProduct($product);
        })->values()->all();

        return response()->json([
            'message' => 'Products retrieved successfully',
            'data' => [
                'category' => $category,
                'data' => $productData,
                'products' => $productData,
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
        ]);
    }

    public function checkStock($id)
    {
        $product = Product::where(function ($query) use ($id) {
            $query->where('id', $id)
                ->orWhere('slug', (string) $id);
        })->where('is_active', true)->where('listing_status', 'approved')->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        return response()->json([
            'message' => 'Stock checked successfully',
            'data' => [
                'product_id' => $product->id,
                'stock' => (int) $product->stock,
                'available' => (int) $product->stock > 0,
                'in_stock' => (int) $product->stock > 0,
                'low_stock' => (int) $product->stock > 0 && (int) $product->stock <= 5,
            ],
        ]);
    }

    public function updateDealStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'is_hot_deal' => 'sometimes|boolean',
            'is_premium' => 'sometimes|boolean',
        ]);

        $product = Product::find($id);
        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $product->fill($validated)->save();

        return response()->json([
            'message' => 'Product deal status updated successfully',
            'data' => $this->transformProduct($product->fresh('category')),
        ]);
    }
}
