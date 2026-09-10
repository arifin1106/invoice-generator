<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        // Lockout sementara per akun setelah beberapa kali percobaan gagal.
        $lockKey = 'login-email:'.strtolower($request->email);
        if (RateLimiter::tooManyAttempts($lockKey, 5)) {
            $seconds = RateLimiter::availableIn($lockKey);

            return response()->json([
                'message' => "Terlalu banyak percobaan login. Coba lagi dalam $seconds detik.",
            ], 429);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($lockKey, 900); // 15 menit

            return response()->json([
                'message' => 'Email atau password salah.'
            ], 401);
        }

        // Berhasil login, reset penghitung kegagalan untuk akun ini.
        RateLimiter::clear($lockKey);

        // Revoke old tokens
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil'
        ]);
    }

    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Semua perangkat berhasil logout'
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
