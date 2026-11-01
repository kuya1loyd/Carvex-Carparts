<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    public function index()
    {
        $version = (int) Cache::get('catalog_cache_version', 1);
        $categories = Cache::remember('catalog:v' . $version . ':categories', 300, function () {
            return Category::query()->orderBy('name')->get();
        });

        return response()->json([
            'message' => 'Categories retrieved successfully',
            'data' => $categories,
        ]);
    }

    public function show($id)
    {
        $category = is_numeric($id)
            ? Category::find((int) $id)
            : Category::where('slug', (string) $id)->first();

        if (!$category) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        return response()->json([
            'message' => 'Category retrieved successfully',
            'data' => $category,
        ]);
    }
}
