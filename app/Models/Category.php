<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'description'];

    protected static function booted()
    {
        static::saved(fn () => Product::bumpCatalogCacheVersion());
        static::deleted(fn () => Product::bumpCatalogCacheVersion());
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
