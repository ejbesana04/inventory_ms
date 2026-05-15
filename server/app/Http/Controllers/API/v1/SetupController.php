<?php

namespace App\Http\Controllers\API\v1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\FirstUserRequest;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class SetupController extends Controller
{
    use ApiResponse;

    public function status(): JsonResponse
    {
        $hasUsers = User::withTrashed()->exists();

        return $this->success([
            'has_users' => $hasUsers,
        ], 'Setup status fetched successfully.');
    }

    public function storeFirstUser(FirstUserRequest $request): JsonResponse
    {
        if (User::withTrashed()->exists()) {
            return $this->error('Account setup is not available. Sign in with an existing account.', 403);
        }

        $validated = $request->validated();
        $validated['is_active'] = true;
        $validated['role'] = $validated['role'] ?? UserRole::ADMIN->value;

        $user = User::create($validated);

        Auth::login($user);
        $request->session()->regenerate();

        return $this->success(
            ['user' => $user->fresh()],
            'First account created successfully.',
            201
        );
    }
}
