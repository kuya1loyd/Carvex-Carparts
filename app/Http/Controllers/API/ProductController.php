<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    private function cacheKey(string $prefix, array $params = []): string
    {
        $version = (int) Cache::get('catalog_cache_version', 1);
        ksort($params);

        return 'catalog:v' . $version . ':' . $prefix . ':' . md5(json_encode($params));
    }

    private function transformProduct(Product $product): array
    {
        $payload = $product->toArray();
        unset($payload['seller_id'], $payload['listing_status'], $payload['review_note']);
        $payload['seller_id'] = $product->seller_id;
        $payload['seller'] = $product->seller ? [
            'id' => $product->seller->id,
            'name' => $product->seller->name,
        ] : null;
        $payload['in_stock'] = (int) $product->stock > 0;
        $payload['low_stock'] = (int) $product->stock > 0 && (int) $product->stock <= 5;

        return $payload;
    }

    private function productQuery(Request $request, bool $activeOnly = true)
    {
        $query = Product::query()->with(['category', 'seller:id,name']);

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
        $key = $this->cacheKey('index', $request->query());

        $payload = Cache::remember($key, 3600, function () use ($request, $perPage) {
            $products = $this->productQuery($request)->paginate($perPage);
            $productData = collect($products->items())->map(function (Product $product) {
                return $this->transformProduct($product);
            })->values()->all();

            return [
                'data' => $productData,
                'products' => $productData,
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ];
        });

        return response()->json([
            'message' => 'Products retrieved successfully',
            'data' => $payload,
        ]);
    }

    public function featured()
    {
        $key = $this->cacheKey('featured');

        $products = Cache::remember($key, 120, function () {
            return Product::with(['category', 'seller:id,name'])
                ->where('is_active', true)
                ->where('listing_status', 'approved')
                ->whereNotNull('images')
                ->latest()
                ->limit(12)
                ->get()
                ->map(function (Product $product) {
                    return $this->transformProduct($product);
                })
                ->values()
                ->all();
        });

        return response()->json([
            'message' => 'Featured products retrieved successfully',
            'data' => $products,
        ]);
    }

    public function hotDeals()
    {
        $key = $this->cacheKey('hot_deals');

        $products = Cache::remember($key, 120, function () {
            return Product::with(['category', 'seller:id,name'])
                ->where('is_active', true)
                ->where('listing_status', 'approved')
                ->where('is_hot_deal', true)
                ->latest()
                ->limit(12)
                ->get()
                ->map(function (Product $product) {
                    return $this->transformProduct($product);
                })
                ->values()
                ->all();
        });

        return response()->json([
            'message' => 'Hot deal products retrieved successfully',
            'data' => $products,
        ]);
    }

    public function premium()
    {
        $key = $this->cacheKey('premium');

        $products = Cache::remember($key, 120, function () {
            return Product::with(['category', 'seller:id,name'])
                ->where('is_active', true)
                ->where('listing_status', 'approved')
                ->where('is_premium', true)
                ->latest()
                ->limit(12)
                ->get()
                ->map(function (Product $product) {
                    return $this->transformProduct($product);
                })
                ->values()
                ->all();
        });

        return response()->json([
            'message' => 'Premium products retrieved successfully',
            'data' => $products,
        ]);
    }

    public function show($id)
    {
        $key = $this->cacheKey('show', ['id' => (string) $id]);

        $productData = Cache::remember($key, 120, function () use ($id) {
            $product = Product::with(['category', 'seller:id,name'])
                ->where(function ($query) use ($id) {
                    if (is_numeric($id)) {
                        $query->where('id', (int) $id)->orWhere('slug', (string) $id);
                    } else {
                        $query->where('slug', (string) $id);
                    }
                })
                ->where('is_active', true)
                ->where('listing_status', 'approved')
                ->first();

            return $product ? $this->transformProduct($product) : null;
        });

        if (!$productData) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        return response()->json([
            'message' => 'Product retrieved successfully',
            'data' => $productData,
        ]);
    }

    public function byCategory($categoryId, Request $request)
    {
        $perPage = max(1, min(1000, (int) $request->input('per_page', 24)));
        $key = $this->cacheKey('by_category', array_merge($request->query(), ['category_id' => (string) $categoryId]));

        $payload = Cache::remember($key, 120, function () use ($categoryId, $perPage) {
            $category = Category::find($categoryId);
            if (!$category) {
                return null;
            }

            $products = Product::with(['category', 'seller:id,name'])
                ->where('category_id', $category->id)
                ->where('is_active', true)
                ->where('listing_status', 'approved')
                ->latest()
                ->paginate($perPage);

            $productData = collect($products->items())->map(function (Product $product) {
                return $this->transformProduct($product);
            })->values()->all();

            return [
                'category' => $category,
                'data' => $productData,
                'products' => $productData,
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ];
        });

        if (!$payload) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        return response()->json([
            'message' => 'Products retrieved successfully',
            'data' => $payload,
        ]);
    }

    public function checkStock($id)
    {
        $product = Product::where(function ($query) use ($id) {
            if (is_numeric($id)) {
                $query->where('id', (int) $id)->orWhere('slug', (string) $id);
            } else {
                $query->where('slug', (string) $id);
            }
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
