<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $supplierId = $this->input('supplier_id');

        $this->merge([
            'supplier_id' => $supplierId === '' ? null : $supplierId,
        ]);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sku' => ['required', 'string', 'max:255', Rule::unique('products', 'sku')],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'brand_name' => ['nullable', 'string', 'max:255'],
            'unit_id' => ['nullable', 'integer', 'exists:units_of_measure,id'],
            'default_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'barcode' => ['nullable', 'string', 'max:255', Rule::unique('products', 'barcode')],
            'image_path' => ['nullable', 'string', 'max:2048'],
            'expiry_date' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
            'allow_negative_stock' => ['sometimes', 'boolean'],
        ];
    }
}
