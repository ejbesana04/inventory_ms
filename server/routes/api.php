<?php

use App\Http\Controllers\API\v1\CategoryController;
use App\Http\Controllers\API\v1\DashboardController;
use App\Http\Controllers\API\v1\ProductController;
use App\Http\Controllers\API\v1\PurchaseOrderController;
use App\Http\Controllers\API\v1\ReportController;
use App\Http\Controllers\API\v1\SaleController;
use App\Http\Controllers\API\v1\SetupController;
use App\Http\Controllers\API\v1\StockMovementController;
use App\Http\Controllers\API\v1\SupplierController;
use App\Http\Controllers\API\v1\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('v1/setup/status', [SetupController::class, 'status']);
Route::post('v1/setup/first-user', [SetupController::class, 'storeFirstUser']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('v1/auth/me', function (Request $request) {
        return response()->json([
            'status' => 'Success',
            'message' => 'Authenticated user.',
            'data' => ['user' => $request->user()],
        ]);
    });

    Route::middleware('permission:dashboard.view')->group(function () {
        Route::get('v1/dashboard/summary', [DashboardController::class, 'summary']);
    });

    Route::middleware('permission:products.view')->group(function () {
        Route::get('v1/products', [ProductController::class, 'index']);
        Route::get('v1/products/{product}', [ProductController::class, 'show']);
    });
    Route::middleware('permission:products.create')->post('v1/products', [ProductController::class, 'store']);
    Route::middleware('permission:products.edit')->match(['put', 'patch'], 'v1/products/{product}', [ProductController::class, 'update']);
    Route::middleware('permission:products.delete')->delete('v1/products/{product}', [ProductController::class, 'destroy']);
    Route::middleware('permission:products.edit')->post('v1/products/{id}/restore', [ProductController::class, 'restore']);
    Route::middleware('permission:products.delete')->delete('v1/products/{id}/permanent', [ProductController::class, 'permanentDelete']);

    Route::middleware('permission:categories.manage')->group(function () {
        Route::get('v1/categories', [CategoryController::class, 'index']);
        Route::post('v1/categories', [CategoryController::class, 'store']);
        Route::match(['put', 'patch'], 'v1/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('v1/categories/{category}', [CategoryController::class, 'destroy']);
    });

    Route::middleware('permission:suppliers.manage')->group(function () {
        Route::get('v1/suppliers', [SupplierController::class, 'index']);
        Route::post('v1/suppliers', [SupplierController::class, 'store']);
        Route::match(['put', 'patch'], 'v1/suppliers/{supplier}', [SupplierController::class, 'update']);
        Route::delete('v1/suppliers/{supplier}', [SupplierController::class, 'destroy']);
    });

    Route::middleware('permission:stock.view')->get('v1/stock-movements', [StockMovementController::class, 'index']);
    Route::middleware('permission:stock.adjust')->post('v1/stock-movements', [StockMovementController::class, 'store']);

    Route::middleware('permission:purchases.manage')->group(function () {
        Route::get('v1/purchase-orders', [PurchaseOrderController::class, 'index']);
        Route::post('v1/purchase-orders', [PurchaseOrderController::class, 'store']);
        Route::match(['put', 'patch'], 'v1/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'update']);
        Route::post('v1/purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive']);
    });

    Route::middleware('permission:sales.manage')->group(function () {
        Route::get('v1/sales', [SaleController::class, 'index']);
        Route::post('v1/sales', [SaleController::class, 'store']);
    });

    Route::middleware('permission:dashboard.view')->group(function () {
        Route::get('v1/reports/summary', [ReportController::class, 'summary']);
        Route::get('v1/reports/summary/pdf', [ReportController::class, 'summaryPdf']);
        Route::get('v1/reports/low-stock', [ReportController::class, 'lowStock']);
        Route::get('v1/reports/inventory', [ReportController::class, 'inventorySummary']);
        Route::get('v1/reports/stock-movement', [ReportController::class, 'stockMovement']);
        Route::get('v1/reports/sales', [ReportController::class, 'sales']);
        Route::get('v1/reports/purchases', [ReportController::class, 'purchases']);
        Route::get('v1/reports/suppliers', [ReportController::class, 'suppliers']);
    });

    Route::middleware('permission:users.manage')->group(function () {
        Route::get('v1/users/active/count', [UserController::class, 'activeCount']);
        Route::post('v1/users/{id}/restore', [UserController::class, 'restore']);
        Route::apiResource('v1/users', UserController::class);
    });
});
