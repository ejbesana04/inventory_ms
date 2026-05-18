<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class TokenAuthController extends Controller
{
    use ApiResponse;

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if (! $user->is_active) {
            return $this->error('This account has been deactivated.', 403);
        }

        $tokenName = 'mobile';
        $user->tokens()->where('name', $tokenName)->delete();

        $expiresAt = ($credentials['remember'] ?? false)
            ? now()->addDays(30)
            : now()->addHours(12);

        $token = $user->createToken($tokenName, ['*'], $expiresAt)->plainTextToken;

        ActivityLogger::log('auth.login', 'Mobile user signed in.', $user, [
            'email' => $user->email,
        ]);

        return $this->success([
            'user' => $user,
            'token' => $token,
        ], 'Signed in successfully.');
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            ActivityLogger::log('auth.logout', 'Mobile user signed out.', $user);
            $user->currentAccessToken()?->delete();
        }

        return $this->success(null, 'Signed out successfully.');
    }
}
