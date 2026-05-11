<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockMovementStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'movement_type' => ['required', Rule::in(['in', 'out', 'adjustment'])],
            'quantity' => ['required', 'integer', 'min:0'],
            'warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'reason' => ['nullable', 'string', 'max:2000'],
            'admin_override' => ['sometimes', 'boolean'],
        ];
    }
}
