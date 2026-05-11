<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(Customer::query()->orderBy('name')->paginate(20), 'Customers loaded.');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $data['is_active'] = $data['is_active'] ?? true;

        return $this->success(Customer::query()->create($data), 'Customer created.', 201);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $customer->update($data);

        return $this->success($customer->fresh(), 'Customer updated.');
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();

        return $this->success(null, 'Customer removed.');
    }
}
