<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Requests\ProductUpdateRequest;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrderLine;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\StockTransferItem;
use App\Models\UnitOfMeasure;
use App\Services\ActivityLogger;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->with([
                'category:id,name',
                'supplier:id,name',
                'brand:id,name',
                'unit:id,code,name',
                'defaultWarehouse:id,code,name',
            ]);

        if ($request->query('filter') === 'archived') {
            $query->onlyTrashed();
        }

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->integer('supplier_id'));
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock_quantity', '<=', 'reorder_level');
        }

        $sort = $request->string('sort', 'created_at')->toString();
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';
        if (! in_array($sort, ['created_at', 'name', 'sku', 'stock_quantity', 'selling_price'], true)) {
            $sort = 'created_at';
        }

        $perPage = min($request->integer('per_page', 15), 100);

        $paginator = $query->orderBy($sort, $direction)->paginate($perPage);

        $items = collect($paginator->items())->map(fn (Product $product): array => $this->serializeProduct($product))->values()->all();

        return $this->success([
            'items' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ], 'Products fetched successfully.');
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['category', 'supplier', 'brand', 'unit', 'defaultWarehouse']);

        return $this->success($this->serializeProduct($product), 'Product details.');
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $product = DB::transaction(function () use ($validated): Product {
            $category = Category::firstOrCreate(
                ['name' => $validated['category']],
                ['description' => null]
            );

            $brandId = null;
            if (! empty($validated['brand_name'])) {
                $slug = str()->slug($validated['brand_name']);
                $brand = Brand::query()->firstOrCreate(
                    ['slug' => $slug],
                    ['name' => $validated['brand_name'], 'is_active' => true]
                );
                $brandId = $brand->id;
            } elseif (! empty($validated['brand_id'])) {
                $brandId = (int) $validated['brand_id'];
            }

            $unitId = $validated['unit_id'] ?? null;
            $warehouseId = $validated['default_warehouse_id'] ?? null;

            $product = Product::create([
                'category_id' => $category->id,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'brand_id' => $brandId,
                'unit_id' => $unitId,
                'default_warehouse_id' => $warehouseId,
                'sku' => $validated['sku'],
                'barcode' => $validated['barcode'] ?? null,
                'name' => $validated['name'],
                'description' => $validated['notes'] ?? $validated['description'] ?? null,
                'image_path' => $validated['image_path'] ?? null,
                'cost_price' => $validated['cost_price'] ?? $validated['unit_price'],
                'selling_price' => $validated['selling_price'] ?? $validated['unit_price'],
                'stock_quantity' => $validated['stock_quantity'],
                'reorder_level' => $validated['reorder_level'],
                'expiry_date' => $validated['expiry_date'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'allow_negative_stock' => $validated['allow_negative_stock'] ?? false,
            ]);

            StockMovement::create([
                'product_id' => $product->id,
                'user_id' => auth()->id(),
                'warehouse_id' => $warehouseId,
                'movement_type' => 'in',
                'quantity' => $validated['stock_quantity'],
                'previous_stock' => 0,
                'new_stock' => $validated['stock_quantity'],
                'reason' => 'Initial stock on product creation',
                'reference_type' => Product::class,
                'reference_id' => $product->id,
            ]);

            return $product->load(['category', 'supplier', 'brand', 'unit', 'defaultWarehouse']);
        });

        ActivityLogger::log('product.create', "Created product {$product->sku}", $product);

        return $this->success($this->serializeProduct($product), 'Product created successfully.', 201);
    }

    public function update(ProductUpdateRequest $request, Product $product): JsonResponse
    {
        $validated = $request->validated();

        $before = $product->replicate();

        DB::transaction(function () use ($validated, $product): void {
            if (isset($validated['category'])) {
                $category = Category::firstOrCreate(
                    ['name' => $validated['category']],
                    ['description' => null]
                );
                $product->category_id = $category->id;
            }

            if (! empty($validated['brand_name'])) {
                $slug = str()->slug($validated['brand_name']);
                $brand = Brand::query()->firstOrCreate(
                    ['slug' => $slug],
                    ['name' => $validated['brand_name'], 'is_active' => true]
                );
                $product->brand_id = $brand->id;
            } elseif (array_key_exists('brand_id', $validated)) {
                $product->brand_id = $validated['brand_id'];
            }

            foreach (['supplier_id', 'unit_id', 'default_warehouse_id', 'sku', 'barcode', 'name', 'image_path', 'reorder_level', 'expiry_date', 'is_active', 'allow_negative_stock', 'archived_at'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $product->{$field} = $validated[$field];
                }
            }

            if (array_key_exists('notes', $validated)) {
                $product->description = $validated['notes'];
            }
            if (array_key_exists('description', $validated)) {
                $product->description = $validated['description'];
            }

            if (array_key_exists('cost_price', $validated)) {
                $product->cost_price = $validated['cost_price'];
            }
            if (array_key_exists('selling_price', $validated)) {
                $product->selling_price = $validated['selling_price'];
            }
            if (array_key_exists('unit_price', $validated)) {
                $product->cost_price = $validated['unit_price'];
                $product->selling_price = $validated['unit_price'];
            }

            $product->save();
        });

        ActivityLogger::log('product.update', "Updated product {$product->sku}", $product, [
            'before' => $before->only(['name', 'stock_quantity', 'selling_price', 'cost_price']),
            'after' => $product->fresh()->only(['name', 'stock_quantity', 'selling_price', 'cost_price']),
        ]);

        $product->load(['category', 'supplier', 'brand', 'unit', 'defaultWarehouse']);

        return $this->success($this->serializeProduct($product), 'Product updated successfully.');
    }

    public function destroy(Product $product): JsonResponse
    {
        $sku = $product->sku;
        $product->delete();

        ActivityLogger::log('product.delete', "Deleted product {$sku}", null, ['sku' => $sku]);

        return $this->success(null, 'Product archived successfully.');
    }

    public function restore(int $id): JsonResponse
    {
        $product = Product::withTrashed()->findOrFail($id);
        $product->restore();
        $product->archived_at = null;
        $product->save();

        ActivityLogger::log('product.restore', "Restored product {$product->sku}", $product);

        return $this->success($this->serializeProduct($product->fresh(['category', 'supplier', 'brand', 'unit', 'defaultWarehouse'])), 'Product restored.');
    }

    public function permanentDelete(int $id): JsonResponse
    {
        $product = Product::withTrashed()->findOrFail($id);

        // Check for dependent records
        $hasPurchaseOrders = PurchaseOrderLine::where('product_id', $id)->exists();
        $hasSales = SaleItem::where('product_id', $id)->exists();
        $hasStockTransfers = StockTransferItem::where('product_id', $id)->exists();

        if ($hasPurchaseOrders || $hasSales || $hasStockTransfers) {
            return $this->error('Cannot permanently delete product. It has associated purchase orders, sales, or stock transfers.', 409);
        }

        $sku = $product->sku;
        $product->forceDelete();

        ActivityLogger::log('product.permanent_delete', "Permanently deleted product {$sku}", null, ['sku' => $sku, 'id' => $id]);

        return $this->success(null, 'Product permanently deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProduct(Product $product): array
    {
        $low = $product->stock_quantity <= $product->reorder_level;

        return [
            'id' => $product->id,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'name' => $product->name,
            'category' => $product->category?->name ?? 'Uncategorized',
            'category_id' => $product->category_id,
            'brand' => $product->brand?->name,
            'brand_id' => $product->brand_id,
            'unit' => $product->unit?->code,
            'unit_id' => $product->unit_id,
            'supplier_id' => $product->supplier_id,
            'supplier' => $product->supplier?->name,
            'warehouse_id' => $product->default_warehouse_id,
            'warehouse' => $product->defaultWarehouse?->name,
            'cost_price' => (float) $product->cost_price,
            'selling_price' => (float) $product->selling_price,
            'unit_price' => (float) $product->selling_price,
            'stock_quantity' => (int) $product->stock_quantity,
            'reorder_level' => (int) $product->reorder_level,
            'notes' => $product->description,
            'description' => $product->description,
            'image_path' => $product->image_path,
            'expiry_date' => $product->expiry_date,
            'is_active' => (bool) $product->is_active,
            'archived_at' => $product->archived_at,
            'allow_negative_stock' => (bool) $product->allow_negative_stock,
            'low_stock' => $low,
            'created_at' => $product->created_at,
            'deleted_at' => $product->deleted_at,
        ];
    }
}
