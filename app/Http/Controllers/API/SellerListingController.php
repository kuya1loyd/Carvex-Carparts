<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class SellerListingController extends Controller
{
    public function index(Request $request)
    {
        if (!$this->isCustomer($request)) {
            return response()->json(['message' => 'Customer access required.'], 403);
        }

        $query = Product::query()
            ->with('category')
            ->where('seller_id', $request->user()->id)
            ->latest();

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', '%' . $search . '%')
                    ->orWhere('brand', 'like', '%' . $search . '%')
                    ->orWhere('sku', 'like', '%' . $search . '%');
            });
        }

        $status = (string) $request->query('status', '');
        if (in_array($status, ['pending', 'approved', 'rejected', 'archived'], true)) {
            $query->where('listing_status', $status);
        } else {
            $query->where('listing_status', '!=', 'archived');
        }

        $listings = $query->get();

        return response()->json([
            'message' => 'Your listings were retrieved successfully.',
            'data' => ['listings' => $listings],
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isCustomer($request)) {
            return response()->json(['message' => 'Customer access required.'], 403);
        }

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'brand' => 'required|string|max:255',
            'description' => 'required|string|max:10000',
            'price' => 'required|numeric|min:0|max:99999999.99',
            'stock' => 'required|integer|min:0|max:1000000',
            'vehicle_compatibility' => 'nullable|string|max:255',
            'images' => 'nullable|array|max:6',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $product = Product::create([
            'category_id' => $validated['category_id'],
            'seller_id' => $request->user()->id,
            'name' => trim($validated['name']),
            'slug' => $this->uniqueSlug($validated['name']),
            'brand' => trim($validated['brand']),
            'description' => trim($validated['description']),
            'price' => $validated['price'],
            'stock' => $validated['stock'],
            'vehicle_compatibility' => $validated['vehicle_compatibility'] ?? null,
            'images' => $this->saveImages($request),
            'is_active' => false,
            'is_hot_deal' => false,
            'is_premium' => false,
            'listing_status' => 'pending',
            'review_note' => null,
        ]);

        $this->logListingEvent($request, $product, 'listing_created', 'Submitted a part for review.');

        return response()->json([
            'message' => 'Listing submitted. It will appear in the shop after admin approval.',
            'data' => $product->load('category'),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        if (!$this->isCustomer($request)) {
            return response()->json(['message' => 'Customer access required.'], 403);
        }

        $product = Product::query()
            ->where('seller_id', $request->user()->id)
            ->find($id);

        if (!$product) {
            return response()->json(['message' => 'Listing not found.'], 404);
        }

        $validated = $request->validate([
            'category_id' => 'sometimes|required|exists:categories,id',
            'name' => 'sometimes|required|string|max:255',
            'brand' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string|max:10000',
            'price' => 'sometimes|required|numeric|min:0|max:99999999.99',
            'stock' => 'sometimes|required|integer|min:0|max:1000000',
            'vehicle_compatibility' => 'nullable|string|max:255',
            'images' => 'nullable|array|max:' . max(0, 6 - count((array) $product->images)),
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        foreach (['name', 'brand', 'description'] as $textField) {
            if (array_key_exists($textField, $validated)) {
                $validated[$textField] = trim($validated[$textField]);
            }
        }

        unset($validated['images']);
        if ($request->hasFile('images')) {
            $validated['images'] = array_values(array_merge(
                (array) $product->images,
                $this->saveImages($request)
            ));
        }

        if (array_key_exists('name', $validated)) {
            $validated['slug'] = $this->uniqueSlug($validated['name'], $product->id);
        }

        // Seller edits go back to moderation so changed details are checked before being shown publicly.
        $validated['listing_status'] = 'pending';
        $validated['is_active'] = false;
        $validated['review_note'] = null;
        $product->fill($validated)->save();

        $this->logListingEvent($request, $product, 'listing_updated', 'Updated listing details and resubmitted it for review.');

        return response()->json([
            'message' => 'Listing updated and sent for review.',
            'data' => $product->fresh('category'),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        if (!$this->isCustomer($request)) {
            return response()->json(['message' => 'Customer access required.'], 403);
        }

        $product = Product::query()
            ->where('seller_id', $request->user()->id)
            ->find($id);

        if (!$product) {
            return response()->json(['message' => 'Listing not found.'], 404);
        }

        $product->forceFill([
            'listing_status' => 'archived',
            'is_active' => false,
        ])->save();

        $this->logListingEvent($request, $product, 'listing_archived', 'Removed the listing from the shop.');

        return response()->json(['message' => 'Listing removed from the shop.']);
    }

    private function isCustomer(Request $request): bool
    {
        return $request->user() && $request->user()->role === 'customer';
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        do {
            $slug = Str::slug($name) . '-' . Str::lower(Str::random(5));
            $exists = Product::query()->where('slug', $slug)->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))->exists();
        } while ($exists);

        return $slug;
    }

    private function saveImages(Request $request): array
    {
        $images = [];
        $directory = public_path('images');
        File::ensureDirectoryExists($directory);

        foreach ($request->file('images', []) as $image) {
            $filename = now()->format('YmdHis') . '_' . Str::random(12) . '.' . $image->getClientOriginalExtension();
            $image->move($directory, $filename);
            $images[] = '/images/' . $filename;
        }

        return $images;
    }

    private function logListingEvent(Request $request, Product $product, string $action, string $description): void
    {
        $actor = $request->user();

        UserActivityLog::create([
            'user_id' => $actor->id,
            'product_id' => $product->id,
            'type' => 'seller',
            'action' => $action,
            'actor_name' => $actor->name,
            'actor_email' => $actor->email,
            'subject_name' => $product->name,
            'description' => $description,
            'metadata' => [
                'listing_id' => $product->id,
                'listing_status' => $product->listing_status,
            ],
        ]);
    }
}
