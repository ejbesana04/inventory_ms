<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    use ApiResponse;

    public function summary(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        $salesQuery = Sale::query()->whereBetween('created_at', [$from, $to]);
        $purchaseQuery = PurchaseOrder::query()->whereBetween('created_at', [$from, $to]);
        $movementQuery = StockMovement::query()->whereBetween('created_at', [$from, $to]);

        $lowStockItems = Product::query()
            ->with('category:id,name')
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('stock_quantity')
            ->take(10)
            ->get(['id', 'name', 'sku', 'category_id', 'stock_quantity', 'reorder_level'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category?->name ?? 'Uncategorized',
                'stock_quantity' => (int) $product->stock_quantity,
                'reorder_level' => (int) $product->reorder_level,
            ])
            ->values();

        $recentSales = Sale::query()
            ->with('customer:id,name')
            ->whereBetween('created_at', [$from, $to])
            ->latest()
            ->take(8)
            ->get()
            ->map(fn (Sale $sale) => [
                'id' => $sale->id,
                'sale_no' => $sale->sale_no,
                'customer' => $sale->customer?->name,
                'total' => (float) $sale->total,
                'status' => $sale->status,
                'created_at' => $sale->created_at,
            ])
            ->values();

        return $this->success([
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'kpis' => [
                'products' => Product::query()->count(),
                'suppliers' => Supplier::query()->count(),
                'low_stock' => Product::query()->whereColumn('stock_quantity', '<=', 'reorder_level')->count(),
                'sales_count' => (clone $salesQuery)->count(),
                'sales_total' => (float) ((clone $salesQuery)->sum('total') ?? 0),
                'purchase_count' => (clone $purchaseQuery)->count(),
                'stock_in_qty' => (int) (clone $movementQuery)->where('movement_type', 'in')->sum('quantity'),
                'stock_out_qty' => (int) (clone $movementQuery)->where('movement_type', 'out')->sum('quantity'),
            ],
            'low_stock_items' => $lowStockItems,
            'recent_sales' => $recentSales,
        ], 'Reports summary.');
    }

    public function inventorySummary(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        $products = Product::query()
            ->with(['category:id,name', 'supplier:id,name'])
            ->whereBetween('updated_at', [$from, $to])
            ->orderBy('name')
            ->get();

        return $this->success($products, 'Inventory summary.');
    }

    public function lowStock(Request $request): JsonResponse
    {
        $rows = Product::query()
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('stock_quantity')
            ->get();

        return $this->success($rows, 'Low stock report.');
    }

    public function stockMovement(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        $rows = StockMovement::query()
            ->with(['product:id,name', 'user:id,name'])
            ->whereBetween('created_at', [$from, $to])
            ->latest()
            ->get();

        return $this->success($rows, 'Stock movement report.');
    }

    public function sales(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        $rows = Sale::query()
            ->with('customer:id,name')
            ->whereBetween('created_at', [$from, $to])
            ->latest()
            ->get();

        return $this->success($rows, 'Sales report.');
    }

    public function purchases(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        $rows = PurchaseOrder::query()
            ->with('supplier:id,name')
            ->whereBetween('created_at', [$from, $to])
            ->latest()
            ->get();

        return $this->success($rows, 'Purchase report.');
    }

    public function suppliers(): JsonResponse
    {
        return $this->success(Supplier::query()->orderBy('name')->get(), 'Supplier report.');
    }

    public function exportLowStockCsv(): StreamedResponse
    {
        $rows = Product::query()
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('name')
            ->get(['sku', 'name', 'stock_quantity', 'reorder_level']);

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['SKU', 'Name', 'Stock', 'Reorder']);
            foreach ($rows as $p) {
                fputcsv($out, [$p->sku, $p->name, $p->stock_quantity, $p->reorder_level]);
            }
            fclose($out);
        }, 'low-stock-'.now()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function range(Request $request): array
    {
        $from = Carbon::parse($request->input('from', now()->subDays(30)->toDateString()))->startOfDay();
        $to = Carbon::parse($request->input('to', now()->toDateString()))->endOfDay();

        return [$from, $to];
    }
}
