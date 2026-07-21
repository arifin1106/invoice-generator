<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function show(): JsonResponse
    {
        $setting = Setting::first();
        if ($setting) {
            // Return full public URLs so frontend can use them directly
            $setting->logo_url      = $setting->institution_logo
                ? Storage::disk('public')->url($setting->institution_logo)
                : null;
            $setting->signature_url = $setting->signer_signature
                ? Storage::disk('public')->url($setting->signer_signature)
                : null;
        }
        return response()->json($setting);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_name'    => 'sometimes|nullable|string|max:255',
            'institution_address' => 'sometimes|nullable|string',
            'institution_phone'   => 'sometimes|nullable|string|max:50',
            'institution_email'   => 'sometimes|nullable|email',
            'bank_name'           => 'sometimes|nullable|string|max:100',
            'bank_account_number' => 'sometimes|nullable|string|max:50',
            'bank_account_name'   => 'sometimes|nullable|string|max:100',
            'signer_name'         => 'sometimes|nullable|string|max:100',
            'signer_title'        => 'sometimes|nullable|string|max:100',
            'payment_message'     => 'sometimes|nullable|string',
        ]);

        $setting = Setting::first();
        if (!$setting) {
            $setting = Setting::create($validated);
        } else {
            $setting->update($validated);
        }

        // Handle logo upload
        if ($request->hasFile('institution_logo')) {
            $request->validate(['institution_logo' => 'image|max:2048']);
            if ($setting->institution_logo) {
                Storage::disk('public')->delete($setting->institution_logo);
            }
            $path = $request->file('institution_logo')->store('logos', 'public');
            $setting->update(['institution_logo' => $path]);
        }

        // Handle signature upload
        if ($request->hasFile('signer_signature')) {
            $request->validate(['signer_signature' => 'image|max:2048']);
            if ($setting->signer_signature) {
                Storage::disk('public')->delete($setting->signer_signature);
            }
            $path = $request->file('signer_signature')->store('signatures', 'public');
            $setting->update(['signer_signature' => $path]);
        }

        return response()->json($setting->fresh());
    }
}
