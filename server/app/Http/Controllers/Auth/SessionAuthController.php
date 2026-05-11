<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SessionAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        if (! Auth::attempt([
            'email' => $credentials['email'],
            'password' => $credentials['password'],
        ], (bool) ($credentials['remember'] ?? false))) {
            return response()->json([
                'status' => 'Error',
                'message' => 'The provided credentials do not match our records.',
                'data' => null,
            ], 422);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();

        if (! $user->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'status' => 'Error',
                'message' => 'This account has been deactivated.',
                'data' => null,
            ], 403);
        }

        ActivityLogger::log('auth.login', 'User signed in.', $user, [
            'email' => $user->email,
        ]);

        return response()->json([
            'status' => 'Success',
            'message' => 'Signed in successfully.',
            'data' => ['user' => $user],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($request->user()) {
            ActivityLogger::log('auth.logout', 'User signed out.', $request->user());
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'status' => 'Success',
            'message' => 'Signed out successfully.',
            'data' => null,
        ]);
    }
}
