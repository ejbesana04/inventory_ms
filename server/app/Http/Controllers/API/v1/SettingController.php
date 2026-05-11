<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    use ApiResponse;

    public function show(string $key): JsonResponse
    {
        $row = Setting::query()->where('key', $key)->first();

        return $this->success($row?->value, 'Setting value.');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:128'],
            'value' => ['nullable', 'array'],
        ]);

        $row = Setting::query()->updateOrCreate(
            ['key' => $data['key']],
            ['value' => $data['value'] ?? []]
        );

        return $this->success($row, 'Setting saved.');
    }
}
