<?php

namespace Database\Factories;

use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockMovement>
 */
class StockMovementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
{
    $prev = fake()->numberBetween(0, 200);
    $qty = fake()->numberBetween(1, 30);
    $type = fake()->randomElement(['in', 'out', 'adjustment']);

    $new = match ($type) {
        'in' => $prev + $qty,
        'out' => max(0, $prev - $qty),
        default => fake()->numberBetween(0, 250),
    };

    return [
        'product_id' => \App\Models\Product::factory(),
        'user_id' => \App\Models\User::factory(),
        'movement_type' => $type,
        'quantity' => $qty,
        'previous_stock' => $prev,
        'new_stock' => $new,
        'reason' => fake()->optional()->sentence(),
    ];
}
}
