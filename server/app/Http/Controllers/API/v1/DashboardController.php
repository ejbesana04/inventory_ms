<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    use ApiResponse;

    public function summary(): JsonResponse
    {
        $totalProducts = Product::query()->count();
        $totalCategories = Category::query()->count();
        $totalSuppliers = Supplier::query()->where('is_active', true)->count();
        $lowStock = Product::query()
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->count();
        $outOfStock = Product::query()
            ->where('stock_quantity', '<=', 0)
            ->count();

        $recentMovements = StockMovement::query()
            ->with(['product:id,name', 'user:id,name'])
            ->latest()
            ->take(10)
            ->get()
            ->map(fn (StockMovement $m) => [
                'id' => $m->id,
                'type' => $m->movement_type,
                'item' => $m->product?->name,
                'qty' => (int) $m->quantity,
                'by' => $m->user?->name ?? 'System',
                'created_at' => $m->created_at,
            ]);

        $recentPurchases = PurchaseOrder::query()
            ->with('supplier:id,name')
            ->latest()
            ->take(8)
            ->get()
            ->map(fn (PurchaseOrder $po) => [
                'id' => $po->id,
                'po_number' => $po->po_number,
                'supplier' => $po->supplier?->name,
                'status' => $po->status,
                'created_at' => $po->created_at,
            ]);

        $recentSales = Sale::query()
            ->with('customer:id,name')
            ->latest()
            ->take(8)
            ->get()
            ->map(fn (Sale $s) => [
                'id' => $s->id,
                'sale_no' => $s->sale_no,
                'customer' => $s->customer?->name,
                'total' => (float) $s->total,
                'status' => $s->status,
                'created_at' => $s->created_at,
            ]);

        $activityLogs = ActivityLog::query()
            ->with('user:id,name')
            ->latest()
            ->take(12)
            ->get()
            ->map(fn (ActivityLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'user' => $log->user?->name ?? 'System',
                'created_at' => $log->created_at,
            ]);

        $lowStockPreview = Product::query()
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('stock_quantity')
            ->take(8)
            ->get(['id', 'name', 'sku', 'stock_quantity', 'reorder_level']);

        return $this->success([
            'counts' => [
                'products' => $totalProducts,
                'categories' => $totalCategories,
                'suppliers' => $totalSuppliers,
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
            ],
            'low_stock_preview' => $lowStockPreview,
            'recent_movements' => $recentMovements,
            'recent_purchases' => $recentPurchases,
            'recent_sales' => $recentSales,
            'activity_logs' => $activityLogs,
        ], 'Dashboard summary loaded.');
    }
}
