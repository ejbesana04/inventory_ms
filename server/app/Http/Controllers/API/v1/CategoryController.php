<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CategoryRequest;
use App\Models\Category;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $categories = Category::query()->latest()->get();

        return $this->success($categories, 'Categories fetched successfully.');
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        return $this->success($category, 'Category created successfully.', 201);
    }

    public function update(CategoryRequest $request, Category $category): JsonResponse
    {
        $category->update($request->validated());

        return $this->success($category->fresh(), 'Category updated successfully.');
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->delete();

        return $this->success(null, 'Category deleted successfully.');
    }
}
