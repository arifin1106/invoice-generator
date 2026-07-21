<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    /**
     * GET /api/settings
     */
    public function show(): JsonResponse
    {
        $settings = Setting::singleton();

        // Add public URLs for file fields
        if ($settings->institution_logo) {
            $settings->institution_logo_url = Storage::url($settings->institution_logo);
        }
        if ($settings->signer_signature) {
            $settings->signer_signature_url = Storage::url($settings->signer_signature);
        }

        return response()->json($settings);
    }

    /**
     * PUT /api/settings
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_name'    => 'sometimes|string|max:255',
            'institution_address' => 'sometimes|nullable|string',
            'institution_phone'   => 'sometimes|nullable|string|max:50',
            'institution_email'   => 'sometimes|nullable|email|max:255',
            'bank_name'           => 'sometimes|nullable|string|max:100',
            'bank_account_number' => 'sometimes|nullable|string|max:50',
            'bank_account_name'   => 'sometimes|nullable|string|max:255',
            'signer_name'         => 'sometimes|nullable|string|max:255',
            'signer_title'        => 'sometimes|nullable|string|max:100',
            'payment_message'     => 'sometimes|nullable|string',
        ]);

        $settings = Setting::singleton();

        // Handle logo upload
        if ($request->hasFile('institution_logo')) {
            $request->validate(['institution_logo' => 'image|max:2048']);
            if ($settings->institution_logo) {
                Storage::delete($settings->institution_logo);
            }
            $validated['institution_logo'] = $request->file('institution_logo')->store('logos', 'public');
        }

        // Handle signature upload
        if ($request->hasFile('signer_signature')) {
            $request->validate(['signer_signature' => 'image|max:2048']);
            if ($settings->signer_signature) {
                Storage::delete($settings->signer_signature);
            }
            $validated['signer_signature'] = $request->file('signer_signature')->store('signatures', 'public');
        }

        $settings->update($validated);

        // Return fresh with URLs
        return $this->show();
    }
}
