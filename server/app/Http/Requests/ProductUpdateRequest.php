<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductUpdateRequest extends FormRequest
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
        $product = $this->route('product');

        return [
            'sku' => ['sometimes', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($product->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:255'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'brand_name' => ['nullable', 'string', 'max:255'],
            'unit_id' => ['nullable', 'integer', 'exists:units_of_measure,id'],
            'default_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'barcode' => ['nullable', 'string', 'max:255', Rule::unique('products', 'barcode')->ignore($product->id)],
            'cost_price' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'numeric', 'min:0'],
            'unit_price' => ['sometimes', 'numeric', 'min:0'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:2048'],
            'expiry_date' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
            'allow_negative_stock' => ['sometimes', 'boolean'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'archived_at' => ['nullable', 'date'],
        ];
    }
}
