<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StockMovementStoreRequest;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\ActivityLogger;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockMovementController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $movements = StockMovement::query()
            ->with(['product:id,name', 'user:id,name', 'warehouse:id,name'])
            ->latest()
            ->take(50)
            ->get()
            ->map(function (StockMovement $movement): array {
                return [
                    'id' => $movement->id,
                    'type' => $movement->movement_type,
                    'item' => $movement->product?->name ?? 'Unknown Product',
                    'qty' => (int) $movement->quantity,
                    'previous_stock' => (int) $movement->previous_stock,
                    'new_stock' => (int) $movement->new_stock,
                    'by' => $movement->user?->name ?? 'System',
                    'warehouse' => $movement->warehouse?->name,
                    'reason' => $movement->reason,
                    'created_at' => $movement->created_at,
                ];
            });

        return $this->success($movements, 'Stock movements fetched successfully.');
    }

    public function store(StockMovementStoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        $movement = DB::transaction(function () use ($data): StockMovement {
            /** @var Product $product */
            $product = Product::query()->lockForUpdate()->findOrFail($data['product_id']);

            $previous = (int) $product->stock_quantity;
            $qty = (int) $data['quantity'];
            $type = $data['movement_type'];

            $newStock = match ($type) {
                'in' => $previous + $qty,
                'out' => $previous - $qty,
                'adjustment' => $qty,
                default => $previous,
            };

            if ($type !== 'adjustment' && $qty < 1) {
                throw ValidationException::withMessages(['quantity' => ['Quantity must be at least 1 for stock in/out.']]);
            }

            if ($newStock < 0 && ! $product->allow_negative_stock && ! ($data['admin_override'] ?? false)) {
                throw ValidationException::withMessages([
                    'quantity' => ['Insufficient stock. Enable negative stock on the product or use admin override.'],
                ]);
            }

            $product->stock_quantity = $newStock;
            $product->save();

            $movementQty = match ($type) {
                'adjustment' => abs($newStock - $previous),
                default => $qty,
            };

            $movement = StockMovement::create([
                'product_id' => $product->id,
                'user_id' => auth()->id(),
                'warehouse_id' => $data['warehouse_id'] ?? $product->default_warehouse_id,
                'movement_type' => $type,
                'quantity' => $movementQty,
                'previous_stock' => $previous,
                'new_stock' => $newStock,
                'reason' => $data['reason'] ?? null,
                'reference_type' => null,
                'reference_id' => null,
            ]);

            return $movement->load(['product:id,name', 'user:id,name', 'warehouse:id,name']);
        });

        ActivityLogger::log('stock.move', "Stock {$data['movement_type']} for product #{$data['product_id']}", $movement->product, [
            'movement_id' => $movement->id,
            'type' => $data['movement_type'],
            'quantity' => $data['quantity'],
        ]);

        return $this->success([
            'id' => $movement->id,
            'type' => $movement->movement_type,
            'previous_stock' => (int) $movement->previous_stock,
            'new_stock' => (int) $movement->new_stock,
        ], 'Stock movement recorded.', 201);
    }
}
