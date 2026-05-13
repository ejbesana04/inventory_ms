<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Inventory Summary Report</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
        h1 { font-size: 18px; margin: 0 0 8px 0; }
        .muted { color: #555; font-size: 10px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f0f0f0; font-weight: bold; }
        .right { text-align: right; }
        .section { margin-top: 14px; font-size: 12px; font-weight: bold; }
        .kpis td { width: 25%; }
    </style>
</head>
<body>
    <h1>Inventory — Summary Report</h1>
    <p class="muted">
        Period: {{ $report['period']['from'] }} to {{ $report['period']['to'] }}
        &nbsp;|&nbsp; Generated: {{ now()->format('Y-m-d H:i') }}
    </p>

    <p class="section">Key metrics</p>
    <table class="kpis">
        <tr>
            <td><strong>Total products</strong><br>{{ $report['kpis']['products'] }}</td>
            <td><strong>Suppliers</strong><br>{{ $report['kpis']['suppliers'] }}</td>
            <td><strong>Low stock (count)</strong><br>{{ $report['kpis']['low_stock'] }}</td>
            <td><strong>Sales (count)</strong><br>{{ $report['kpis']['sales_count'] }}</td>
        </tr>
        <tr>
            <td><strong>Sales total</strong><br>PHP {{ number_format($report['kpis']['sales_total'], 2) }}</td>
            <td><strong>Purchase orders</strong><br>{{ $report['kpis']['purchase_count'] }}</td>
            <td><strong>Stock in qty</strong><br>{{ $report['kpis']['stock_in_qty'] }}</td>
            <td><strong>Stock out qty</strong><br>{{ $report['kpis']['stock_out_qty'] }}</td>
        </tr>
    </table>

    <p class="section">Low stock (top items)</p>
    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th class="right">Stock</th>
                <th class="right">Reorder</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($report['low_stock_items'] as $row)
                <tr>
                    <td>{{ $row['sku'] }}</td>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ $row['category'] }}</td>
                    <td class="right">{{ $row['stock_quantity'] }}</td>
                    <td class="right">{{ $row['reorder_level'] }}</td>
                </tr>
            @empty
                <tr><td colspan="5">No low stock items.</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="section">Recent sales (in period)</p>
    <table>
        <thead>
            <tr>
                <th>Sale no.</th>
                <th>Customer</th>
                <th class="right">Total (PHP)</th>
                <th>Status</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($report['recent_sales'] as $sale)
                <tr>
                    <td>{{ $sale['sale_no'] }}</td>
                    <td>{{ $sale['customer'] ?? 'Walk-in' }}</td>
                    <td class="right">{{ number_format($sale['total'], 2) }}</td>
                    <td>{{ $sale['status'] }}</td>
                    <td>{{ $sale['created_at'] }}</td>
                </tr>
            @empty
                <tr><td colspan="5">No sales in this period.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
