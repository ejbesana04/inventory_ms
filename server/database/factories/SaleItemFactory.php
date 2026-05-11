<?php

namespace Database\Factories;

use App\Models\SaleItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SaleItem>
 */
class SaleItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
{
    $qty = fake()->numberBetween(1, 5);
    $unit = fake()->randomFloat(2, 20, 1000);

    return [
        'sale_id' => \App\Models\Sale::factory(),
        'product_id' => \App\Models\Product::factory(),
        'quantity' => $qty,
        'unit_price' => $unit,
        'line_total' => $qty * $unit,
    ];
}
}
