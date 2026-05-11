<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SupplierRequest;
use App\Models\Supplier;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class SupplierController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $suppliers = Supplier::query()->latest()->get();

        return $this->success($suppliers, 'Suppliers fetched successfully.');
    }

    public function store(SupplierRequest $request): JsonResponse
    {
        $supplier = Supplier::create($request->validated());

        return $this->success($supplier, 'Supplier created successfully.', 201);
    }

    public function update(SupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($request->validated());

        return $this->success($supplier->fresh(), 'Supplier updated successfully.');
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        $supplier->delete();

        return $this->success(null, 'Supplier deleted successfully.');
    }
}
