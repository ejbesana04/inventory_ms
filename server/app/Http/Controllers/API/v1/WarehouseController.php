<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(Warehouse::query()->orderBy('name')->get(), 'Warehouses loaded.');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', 'unique:warehouses,code'],
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $data['is_active'] = $data['is_active'] ?? true;

        return $this->success(Warehouse::query()->create($data), 'Warehouse created.', 201);
    }

    public function update(Request $request, Warehouse $warehouse): JsonResponse
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:32', 'unique:warehouses,code,'.$warehouse->id],
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $warehouse->update($data);

        return $this->success($warehouse->fresh(), 'Warehouse updated.');
    }

    public function destroy(Warehouse $warehouse): JsonResponse
    {
        $warehouse->delete();

        return $this->success(null, 'Warehouse removed.');
    }
}
