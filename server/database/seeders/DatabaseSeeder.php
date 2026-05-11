<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionsSeeder::class,
            CoreCatalogSeeder::class,
            AdminUserSeeder::class,
        ]);

        // Core users
        $users = User::factory()->count(10)->create();

        // Product parents
        $categories = Category::factory()->count(8)->create();
        $suppliers = Supplier::factory()->count(6)->create();

        // Products linked to existing categories/suppliers
        $products = Product::factory()
            ->count(40)
            ->recycle([$categories, $suppliers])
            ->create();

        // Sales + SaleItems linked to existing users/products
        Sale::factory()
            ->count(30)
            ->recycle($users)
            ->create()
            ->each(function (Sale $sale) use ($products) {
                SaleItem::factory()
                    ->count(rand(1, 5))
                    ->for($sale)
                    ->recycle($products)
                    ->create();
            });

        // Stock movements linked to existing products/users
        StockMovement::factory()
            ->count(120)
            ->recycle([$users, $products])
            ->create();
    }
}