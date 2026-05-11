<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(Brand::query()->orderBy('name')->get(), 'Brands loaded.');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $slug = str()->slug($data['name']);
        $brand = Brand::query()->create([
            'name' => $data['name'],
            'slug' => $slug.'-'.str()->random(4),
            'is_active' => $data['is_active'] ?? true,
        ]);

        return $this->success($brand, 'Brand created.', 201);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if (isset($data['name'])) {
            $brand->name = $data['name'];
            $brand->slug = str()->slug($data['name']).'-'.$brand->id;
        }
        if (array_key_exists('is_active', $data)) {
            $brand->is_active = $data['is_active'];
        }
        $brand->save();

        return $this->success($brand->fresh(), 'Brand updated.');
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $brand->delete();

        return $this->success(null, 'Brand removed.');
    }
}
