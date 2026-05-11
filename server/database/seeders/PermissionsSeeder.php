<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\RolePermission;
use Illuminate\Database\Seeder;

class PermissionsSeeder extends Seeder
{
    public function run(): void
    {
        RolePermission::query()->delete();
        Permission::query()->delete();

        $definitions = [
            ['name' => 'View dashboard', 'slug' => 'dashboard.view'],
            ['name' => 'View products', 'slug' => 'products.view'],
            ['name' => 'Create products', 'slug' => 'products.create'],
            ['name' => 'Edit products', 'slug' => 'products.edit'],
            ['name' => 'Delete products', 'slug' => 'products.delete'],
            ['name' => 'Manage categories', 'slug' => 'categories.manage'],
            ['name' => 'Manage suppliers', 'slug' => 'suppliers.manage'],
            ['name' => 'View stock', 'slug' => 'stock.view'],
            ['name' => 'Adjust stock', 'slug' => 'stock.adjust'],
            ['name' => 'Manage purchases', 'slug' => 'purchases.manage'],
            ['name' => 'Manage sales', 'slug' => 'sales.manage'],
            ['name' => 'Manage users', 'slug' => 'users.manage'],
        ];

        $idsBySlug = [];
        foreach ($definitions as $def) {
            $p = Permission::query()->create($def);
            $idsBySlug[$p->slug] = $p->id;
        }

        $allSlugs = array_keys($idsBySlug);

        /** Managers run day-to-day ops and need the same user CRUD as admins. */
        $managerDeny = [];

        $staffAllow = [
            'dashboard.view',
            'products.view',
            'products.create',
            'products.edit',
            'products.delete',
            'categories.manage',
            'suppliers.manage',
            'stock.view',
            'stock.adjust',
            'sales.manage',
            'purchases.manage',
        ];

        foreach ($allSlugs as $slug) {
            RolePermission::query()->create([
                'role' => 'admin',
                'permission_id' => $idsBySlug[$slug],
            ]);
        }

        foreach ($allSlugs as $slug) {
            if (in_array($slug, $managerDeny, true)) {
                continue;
            }
            RolePermission::query()->create([
                'role' => 'manager',
                'permission_id' => $idsBySlug[$slug],
            ]);
        }

        foreach ($staffAllow as $slug) {
            RolePermission::query()->create([
                'role' => 'staff',
                'permission_id' => $idsBySlug[$slug],
            ]);
        }
    }
}
