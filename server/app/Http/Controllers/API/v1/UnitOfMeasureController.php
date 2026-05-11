<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\UnitOfMeasure;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnitOfMeasureController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(UnitOfMeasure::query()->orderBy('name')->get(), 'Units loaded.');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', 'unique:units_of_measure,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        return $this->success(UnitOfMeasure::query()->create($data), 'Unit created.', 201);
    }

    public function update(Request $request, UnitOfMeasure $unitOfMeasure): JsonResponse
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:32', 'unique:units_of_measure,code,'.$unitOfMeasure->id],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);
        $unitOfMeasure->update($data);

        return $this->success($unitOfMeasure->fresh(), 'Unit updated.');
    }

    public function destroy(UnitOfMeasure $unitOfMeasure): JsonResponse
    {
        $unitOfMeasure->delete();

        return $this->success(null, 'Unit removed.');
    }
}
