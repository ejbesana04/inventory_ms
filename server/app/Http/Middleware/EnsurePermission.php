<?php

namespace App\Http\Middleware;

use App\Models\Permission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (Permission::query()->count() === 0) {
            return $next($request);
        }

        if (! $user || ! $user->hasPermission($permission)) {
            return response()->json([
                'status' => 'Error',
                'message' => 'You do not have permission to perform this action.',
                'data' => null,
            ], 403);
        }

        return $next($request);
    }
}
