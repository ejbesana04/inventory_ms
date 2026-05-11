<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\UnitOfMeasure;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class CoreCatalogSeeder extends Seeder
{
    public function run(): void
    {
        Warehouse::query()->firstOrCreate(
            ['code' => 'MAIN'],
            ['name' => 'Main Warehouse', 'address' => 'Primary storage', 'is_active' => true]
        );

        Warehouse::query()->firstOrCreate(
            ['code' => 'RETAIL'],
            ['name' => 'Retail Floor', 'address' => 'Front store', 'is_active' => true]
        );

        UnitOfMeasure::query()->firstOrCreate(
            ['code' => 'PCS'],
            ['name' => 'Pieces', 'description' => 'Count per piece']
        );

        UnitOfMeasure::query()->firstOrCreate(
            ['code' => 'BOX'],
            ['name' => 'Box', 'description' => 'Box / carton']
        );

        Brand::query()->firstOrCreate(
            ['slug' => 'generic'],
            ['name' => 'Generic', 'is_active' => true]
        );
    }
}
