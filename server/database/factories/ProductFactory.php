<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
{
    $cost = fake()->randomFloat(2, 10, 500);
    $sell = $cost + fake()->randomFloat(2, 5, 200);

    return [
        'category_id' => \App\Models\Category::factory(),
        'supplier_id' => \App\Models\Supplier::factory(),
        'sku' => strtoupper(fake()->unique()->bothify('SKU-####??')),
        'barcode' => fake()->optional()->ean13(),
        'name' => fake()->unique()->words(3, true),
        'description' => fake()->sentence(),
        'cost_price' => $cost,
        'selling_price' => $sell,
        'stock_quantity' => fake()->numberBetween(0, 200),
        'reorder_level' => fake()->numberBetween(1, 20),
        'expiry_date' => fake()->optional()->dateTimeBetween('now', '+1 year'),
        'is_active' => true,
    ];
}
}
