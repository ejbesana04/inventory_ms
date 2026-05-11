<?php

namespace Database\Factories;

use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sale>
 */
class SaleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
{
    $subtotal = fake()->randomFloat(2, 100, 5000);
    $discount = fake()->randomFloat(2, 0, 200);
    $tax = ($subtotal - $discount) * 0.12;
    $total = ($subtotal - $discount) + $tax;
    $paid = $total + fake()->randomFloat(2, 0, 300);

    return [
        'sale_no' => 'SALE-' . now()->format('Ymd') . '-' . fake()->unique()->numberBetween(1000, 9999),
        'user_id' => \App\Models\User::factory(),
        'subtotal' => $subtotal,
        'discount' => $discount,
        'tax' => $tax,
        'total' => $total,
        'amount_paid' => $paid,
        'change_amount' => $paid - $total,
        'payment_method' => fake()->randomElement(['cash', 'gcash', 'card', 'bank_transfer']),
        'status' => fake()->randomElement(['completed', 'pending', 'cancelled']),
    ];
}
}
