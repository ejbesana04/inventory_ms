<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    protected $fillable = ['code', 'name', 'address', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function productsDefault(): HasMany
    {
        return $this->hasMany(Product::class, 'default_warehouse_id');
    }
}
