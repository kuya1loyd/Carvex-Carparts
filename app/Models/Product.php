<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'seller_id',
        'name',
        'slug',
        'sku',
        'brand',
        'description',
        'price',
        'stock',
        'vehicle_compatibility',
        'images',
        'is_active',
        'listing_status',
        'review_note',
        'is_hot_deal',
        'is_premium'
    ];

    protected $casts = [
        'images' => 'array',
        'is_active' => 'boolean',
        'is_hot_deal' => 'boolean',
        'is_premium' => 'boolean'
    ];

    protected static function booted()
    {
        static::creating(function (Product $product) {
            if (blank($product->sku)) {
                $product->sku = static::generateUniqueSku($product->name);
            }
        });
    }

    public static function generateUniqueSku(?string $name, ?int $ignoreId = null): string
    {
        $prefix = static::buildSkuPrefix($name);
        $pattern = '/^' . preg_quote($prefix, '/') . '-(\d{3,})$/';

        $existingSkus = static::query()
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->whereNotNull('sku')
            ->where('sku', 'like', $prefix . '-%')
            ->pluck('sku');

        $nextSequence = 1;

        foreach ($existingSkus as $existingSku) {
            if (preg_match($pattern, (string) $existingSku, $matches)) {
                $nextSequence = max($nextSequence, ((int) $matches[1]) + 1);
            }
        }

        do {
            $sku = sprintf('%s-%03d', $prefix, $nextSequence++);
        } while (
            static::query()
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->where('sku', $sku)
                ->exists()
        );

        return $sku;
    }

    protected static function buildSkuPrefix(?string $name): string
    {
        $normalized = Str::of((string) $name)
            ->upper()
            ->replaceMatches('/[^A-Z0-9]+/', ' ')
            ->squish();

        $words = collect(explode(' ', (string) $normalized))
            ->filter()
            ->values();

        if ($words->isEmpty()) {
            return 'PRD';
        }

        $firstWord = (string) $words->first();

        if ($words->count() === 1) {
            return Str::padRight(Str::substr($firstWord, 0, 3), 3, 'X');
        }

        if (strlen($firstWord) >= 2 && strlen($firstWord) <= 4) {
            return $firstWord;
        }

        $prefix = $words
            ->take(3)
            ->map(fn ($word) => Str::substr((string) $word, 0, 1))
            ->implode('');

        return Str::upper($prefix ?: Str::padRight(Str::substr($firstWord, 0, 3), 3, 'X'));
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function cartItems()
    {
        return $this->hasMany(CartItem::class);
    }
}
