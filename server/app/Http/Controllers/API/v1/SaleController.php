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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

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

    public function aiAnalysis(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $salesQuery = Sale::query()
            ->with(['customer:id,name', 'saleItems.product:id,name,sku,stock_quantity'])
            ->latest();

        if (! empty($data['from'])) {
            $salesQuery->whereDate('created_at', '>=', $data['from']);
        }

        if (! empty($data['to'])) {
            $salesQuery->whereDate('created_at', '<=', $data['to']);
        }

        $sales = $salesQuery->limit(200)->get();

        $payload = [
            'generated_at' => now()->toISOString(),
            'totals' => [
                'sales_count' => $sales->count(),
                'total_revenue' => (float) $sales->sum('total'),
            ],
            'sales' => $sales->map(fn (Sale $sale) => [
                'sale_no' => $sale->sale_no,
                'customer' => $sale->customer?->name ?? 'Walk-in',
                'payment_method' => $sale->payment_method,
                'status' => $sale->status,
                'total' => (float) $sale->total,
                'created_at' => $sale->created_at?->toISOString(),
                'items' => $sale->saleItems->map(fn (SaleItem $item) => [
                    'product_name' => $item->product?->name ?? 'Unknown product',
                    'sku' => $item->product?->sku,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                    'current_stock' => $item->product?->stock_quantity,
                ])->values(),
            ])->values(),
        ];

        $n8nUrl = config('services.n8n.sales_analysis_webhook_url');

        try {
            $response = Http::acceptJson()
                ->timeout(60)
                ->post($n8nUrl, $payload);

            Log::info('n8n sales analysis response', [
                'url' => $n8nUrl,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            if (! $response->successful()) {
                return $this->error(
                    'AI sales analysis service returned an error.',
                    Response::HTTP_BAD_GATEWAY
                );
            }

            $analysis = $this->extractAiAnalysis($response);

            if ($analysis === '') {
                return $this->error(
                    'AI workflow completed, but no analysis was returned.',
                    Response::HTTP_BAD_GATEWAY
                );
            }

            return $this->success([
                'analysis' => $analysis,
            ], 'AI sales analysis generated successfully.');
        } catch (\Throwable $e) {
            Log::error('n8n sales analysis call failed', [
                'url' => $n8nUrl,
                'error' => $e->getMessage(),
            ]);

            return $this->error(
                'Could not connect to AI sales analysis service.',
                Response::HTTP_SERVICE_UNAVAILABLE
            );
        }
    }

    private function extractAiAnalysis(\Illuminate\Http\Client\Response $response): string
    {
        $body = trim($response->body());

        if ($body === '') {
            return '';
        }

        $json = $response->json();
        $payload = is_array($json) ? $json : $body;

        if (array_is_list($payload) && isset($payload[0]) && is_array($payload[0])) {
            $payload = $payload[0];
        }

        if (is_string($payload)) {
            return trim($payload);
        }

        foreach (['analysis', 'response', 'output', 'text', 'summary', 'message', 'content'] as $key) {
            $value = data_get($payload, $key);

            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        $nestedSummary = data_get($payload, 'report.summary');

        return is_string($nestedSummary) ? trim($nestedSummary) : '';
    }
}
