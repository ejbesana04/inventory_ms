<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnitOfMeasure extends Model
{
    protected $table = 'units_of_measure';

    protected $fillable = ['code', 'name', 'description'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'unit_id');
    }
}
