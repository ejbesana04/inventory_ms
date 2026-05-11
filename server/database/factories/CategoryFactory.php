<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Beverages',
                'Snacks',
                'Groceries',
                'Personal Care',
                'Household Supplies',
                'Frozen Goods',
                'Canned Goods',
                'Bakery',
            ]) . ' ' . fake()->unique()->numberBetween(1, 999),
            'description' => fake()->sentence(),
        ];
    }
}
