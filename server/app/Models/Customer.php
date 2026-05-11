<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = ['name', 'email', 'phone', 'address', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}
