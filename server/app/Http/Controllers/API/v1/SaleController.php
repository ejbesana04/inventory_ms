<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Services\ActivityLogger;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SaleController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $sales = Sale::query()
            ->with(['user:id,name', 'customer:id,name'])
            ->latest()
            ->paginate(20);

        return $this->success($sales, 'Sales loaded.');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            'payment_method' => ['required', Rule::in(['cash', 'gcash', 'card', 'bank_transfer'])],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        /** @var Sale $sale */
        $sale = DB::transaction(function () use ($data): Sale {
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }
            $discount = (float) ($data['discount'] ?? 0);
            $tax = (float) ($data['tax'] ?? 0);
            $total = max(0, $subtotal - $discount + $tax);

            $saleNo = 'INV-'.now()->format('Ymd').'-'.strtoupper(substr(uniqid(), -6));

            $sale = Sale::query()->create([
                'sale_no' => $saleNo,
                'user_id' => auth()->id(),
                'customer_id' => $data['customer_id'] ?? null,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'amount_paid' => $total,
                'change_amount' => 0,
                'payment_method' => $data['payment_method'],
                'status' => 'completed',
            ]);

            foreach ($data['items'] as $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                SaleItem::query()->create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $lineTotal,
                ]);

                /** @var Product $product */
                $product = Product::query()->lockForUpdate()->findOrFail($item['product_id']);
                $previous = (int) $product->stock_quantity;
                $qty = (int) $item['quantity'];
                if ($previous < $qty && ! $product->allow_negative_stock) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => ["Insufficient stock for product {$product->name}."],
                    ]);
                }
                $new = $previous - $qty;
                $product->stock_quantity = $new;
                $product->save();

                StockMovement::query()->create([
                    'product_id' => $product->id,
                    'user_id' => auth()->id(),
                    'warehouse_id' => $product->default_warehouse_id,
                    'movement_type' => 'out',
                    'quantity' => $qty,
                    'previous_stock' => $previous,
                    'new_stock' => $new,
                    'reason' => "Sale {$saleNo}",
                    'reference_type' => Sale::class,
                    'reference_id' => $sale->id,
                ]);
            }

            return $sale->load('saleItems');
        });

        ActivityLogger::log('sale.create', "Recorded sale {$sale->sale_no}", $sale);

        return $this->success($sale, 'Sale completed.', 201);
    }
}
