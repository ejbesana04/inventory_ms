<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\RolePermission;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class RoleMatrixController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $permissions = Permission::query()->orderBy('slug')->get(['id', 'name', 'slug']);
        $matrix = RolePermission::query()
            ->with('permission:id,slug')
            ->get()
            ->groupBy('role')
            ->map(fn ($rows) => $rows->pluck('permission.slug')->filter()->values());

        return $this->success([
            'permissions' => $permissions,
            'role_slugs' => $matrix,
        ], 'Roles & permissions matrix.');
    }
}
