<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Services\ActivityLogger;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Transfer records document movement between locations.
 * Global on-hand quantity is not changed until per-warehouse stock bins are implemented.
 */
class StockTransferController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $rows = StockTransfer::query()
            ->with(['fromWarehouse:id,name', 'toWarehouse:id,name', 'items.product:id,name'])
            ->latest()
            ->paginate(20);

        return $this->success($rows, 'Transfers loaded.');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from_warehouse_id' => ['required', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'exists:warehouses,id', 'different:from_warehouse_id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $transfer = DB::transaction(function () use ($data): StockTransfer {
            $ref = 'TRF-'.now()->format('Ymd').'-'.strtoupper(substr(uniqid(), -5));

            $transfer = StockTransfer::query()->create([
                'reference' => $ref,
                'from_warehouse_id' => $data['from_warehouse_id'],
                'to_warehouse_id' => $data['to_warehouse_id'],
                'user_id' => auth()->id(),
                'status' => 'completed',
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $row) {
                StockTransferItem::query()->create([
                    'stock_transfer_id' => $transfer->id,
                    'product_id' => $row['product_id'],
                    'quantity' => $row['quantity'],
                ]);
            }

            return $transfer->load('items.product:id,name');
        });

        ActivityLogger::log('stock.transfer', "Recorded transfer {$transfer->reference}", $transfer);

        return $this->success($transfer, 'Stock transfer recorded (audit).', 201);
    }
}
