<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    /**
     * Get current user profile.
     */
    public function show(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Update name, email, and/or password.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $rules = [
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
        ];

        // Only validate password fields if provided
        if ($request->filled('new_password')) {
            $rules['current_password'] = 'required';
            $rules['new_password']     = ['required', 'confirmed', Password::min(6)];
        }

        $validated = $request->validate($rules);

        // Verify current password if changing
        if ($request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'Password saat ini tidak sesuai.',
                    'errors'  => ['current_password' => ['Password saat ini tidak sesuai.']],
                ], 422);
            }
            $user->password = Hash::make($request->new_password);
        }

        if (isset($validated['name']))  $user->name  = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];

        $user->save();

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Upload a new profile photo.
     */
    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png,gif,webp|max:2048',
        ]);

        $user = $request->user();

        // Delete old photo
        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
        }

        $path = $request->file('photo')->store('profiles', 'public');
        $user->profile_photo = $path;
        $user->save();

        return response()->json([
            'message'           => 'Foto profil berhasil diupload.',
            'user'              => $user->fresh(),
            'profile_photo_url' => url('storage/' . $path),
        ]);
    }

    /**
     * Delete profile photo.
     */
    public function deletePhoto(Request $request)
    {
        $user = $request->user();

        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
            $user->profile_photo = null;
            $user->save();
        }

        return response()->json([
            'message' => 'Foto profil berhasil dihapus.',
            'user'    => $user->fresh(),
        ]);
    }
}
