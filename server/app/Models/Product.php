<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'supplier_id',
        'brand_id',
        'unit_id',
        'default_warehouse_id',
        'sku',
        'barcode',
        'name',
        'description',
        'image_path',
        'cost_price',
        'selling_price',
        'stock_quantity',
        'reorder_level',
        'expiry_date',
        'is_active',
        'archived_at',
        'allow_negative_stock',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'expiry_date' => 'date',
        'is_active' => 'boolean',
        'archived_at' => 'datetime',
        'allow_negative_stock' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function unit()
    {
        return $this->belongsTo(UnitOfMeasure::class, 'unit_id');
    }

    public function defaultWarehouse()
    {
        return $this->belongsTo(Warehouse::class, 'default_warehouse_id');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }
}