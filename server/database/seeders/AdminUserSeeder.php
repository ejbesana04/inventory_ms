<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Creates a single admin for local development.
 * Run: php artisan db:seed --class=AdminUserSeeder
 *
 * Default credentials (change after first login in production):
 *   Email: admin@inventory-ms.test
 *   Password: password
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@inventory-ms.test'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('password'),
                'role' => UserRole::ADMIN,
                'is_active' => true,
            ]
        );
    }
}
