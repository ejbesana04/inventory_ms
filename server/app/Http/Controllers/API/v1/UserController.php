<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Models\User;
use App\Support\UserRolePolicy;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        $filter = $request->string('filter', 'active')->toString();
        match ($filter) {
            'deleted' => $query->onlyTrashed(),
            'all' => $query->withTrashed(),
            default => null,
        };

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->string('sort_by', 'created_at')->toString();
        if (! in_array($sortBy, ['name', 'email', 'role', 'created_at'], true)) {
            $sortBy = 'created_at';
        }
        $sortOrder = $request->string('sort_order', 'desc')->toString() === 'asc' ? 'asc' : 'desc';

        $perPage = min($request->integer('limit', $request->integer('per_page', 10)), 100);
        $page = max(1, $request->integer('page', 1));

        $users = $query->orderBy($sortBy, $sortOrder)->paginate($perPage, ['*'], 'page', $page);

        return $this->success($users, 'Users fetched successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $actor = $request->user();

        if (! UserRolePolicy::canAssignRole($actor, $validated['role'])) {
            return $this->error('You are not allowed to assign this role.', 403);
        }

        $user = User::create($validated);

        return $this->success($user->fresh(), 'User created successfully.', 201);
    }

    /**
     * Display the specified resource (including soft-deleted, for admin review).
     */
    public function show(Request $request, string $user): JsonResponse
    {
        $model = User::withTrashed()->findOrFail($user);

        if (! UserRolePolicy::canManageUser($request->user(), $model)) {
            return $this->error('You are not allowed to view this account.', 403);
        }

        return $this->success($model, 'User fetched successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user): JsonResponse
    {
        $actor = $request->user();

        if (! UserRolePolicy::canManageUser($actor, $user)) {
            return $this->error('You are not allowed to modify this account.', 403);
        }

        $validated = $request->validated();

        if (! UserRolePolicy::canAssignRole($actor, $validated['role'])) {
            return $this->error('You are not allowed to assign this role.', 403);
        }

        $user->update($validated);

        return $this->success($user->fresh(), 'User updated successfully.');
    }

    /**
     * Soft-delete the specified user.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return $this->error('You cannot delete your own account.', 422);
        }

        if (! UserRolePolicy::canManageUser($request->user(), $user)) {
            return $this->error('You are not allowed to delete this account.', 403);
        }

        $user->delete();

        return $this->success(null, 'User deleted successfully.');
    }

    /**
     * Restore a soft-deleted user.
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        $user = User::onlyTrashed()->findOrFail($id);

        if (! UserRolePolicy::canManageUser($request->user(), $user)) {
            return $this->error('You are not allowed to restore this account.', 403);
        }

        $user->restore();

        return $this->success($user->fresh(), 'User restored successfully.');
    }

    public function activeCount(): JsonResponse
    {
        return $this->success([
            'count' => User::query()->where('is_active', true)->count(),
        ], 'Active user count fetched successfully.');
    }
}
