<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\StockMovement;
use App\Services\ActivityLogger;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PurchaseOrderController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $orders = PurchaseOrder::query()
            ->with(['supplier:id,name', 'warehouse:id,name', 'lines.product:id,name'])
            ->latest()
            ->paginate(20);

        return $this->success($orders, 'Purchase orders loaded.');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'warehouse_id' => ['nullable', 'exists:warehouses,id'],
            'order_date' => ['nullable', 'date'],
            'expected_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity_ordered' => ['required', 'integer', 'min:1'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);

        $po = DB::transaction(function () use ($data): PurchaseOrder {
            $poNumber = 'PO-'.now()->format('Ymd').'-'.strtoupper(substr(uniqid(), -5));

            $po = PurchaseOrder::query()->create([
                'po_number' => $poNumber,
                'supplier_id' => $data['supplier_id'],
                'user_id' => auth()->id(),
                'warehouse_id' => $data['warehouse_id'] ?? null,
                'status' => 'pending',
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'expected_date' => $data['expected_date'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['lines'] as $line) {
                PurchaseOrderLine::query()->create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $line['product_id'],
                    'quantity_ordered' => $line['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_cost' => $line['unit_cost'],
                ]);
            }

            return $po->load('lines');
        });

        ActivityLogger::log('purchase_order.create', "Created PO {$po->po_number}", $po);

        return $this->success($po, 'Purchase order created.', 201);
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['pending', 'approved', 'received', 'canceled'])],
            'expected_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);
        $purchaseOrder->update($data);

        ActivityLogger::log('purchase_order.update', "Updated PO {$purchaseOrder->po_number}", $purchaseOrder);

        return $this->success($purchaseOrder->fresh(['supplier', 'lines']), 'Purchase order updated.');
    }

    public function receive(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if ($purchaseOrder->status === 'received') {
            return $this->error('Purchase order already received.', 422);
        }

        if ($purchaseOrder->status === 'canceled') {
            return $this->error('Canceled purchase order cannot be received.', 422);
        }

        DB::transaction(function () use ($purchaseOrder): void {
            foreach ($purchaseOrder->lines as $line) {
                $remaining = $line->quantity_ordered - $line->quantity_received;
                if ($remaining <= 0) {
                    continue;
                }

                /** @var Product $product */
                $product = Product::query()->lockForUpdate()->findOrFail($line->product_id);
                $previous = (int) $product->stock_quantity;
                $new = $previous + $remaining;

                $product->stock_quantity = $new;
                $product->save();

                StockMovement::query()->create([
                    'product_id' => $product->id,
                    'user_id' => auth()->id(),
                    'warehouse_id' => $purchaseOrder->warehouse_id ?? $product->default_warehouse_id,
                    'movement_type' => 'in',
                    'quantity' => $remaining,
                    'previous_stock' => $previous,
                    'new_stock' => $new,
                    'reason' => "Received from PO {$purchaseOrder->po_number}",
                    'reference_type' => PurchaseOrder::class,
                    'reference_id' => $purchaseOrder->id,
                ]);

                $line->quantity_received = $line->quantity_ordered;
                $line->save();
            }

            $purchaseOrder->status = 'received';
            $purchaseOrder->save();
        });

        ActivityLogger::log('purchase_order.receive', "Received PO {$purchaseOrder->po_number}", $purchaseOrder);

        return $this->success($purchaseOrder->fresh(['lines']), 'Stock received from purchase order.');
    }
}
