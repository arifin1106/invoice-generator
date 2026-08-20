<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = PaymentCategory::orderBy('id')->get();
        return response()->json($categories);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'categories'                => 'required|array|min:1',
            'categories.*.id'           => 'required|integer|exists:payment_categories',
            'categories.*.default_amount' => 'required|numeric|min:0',
        ]);

        foreach ($validated['categories'] as $cat) {
            PaymentCategory::where('id', $cat['id'])->update([
                'default_amount' => $cat['default_amount'],
            ]);
        }

        return response()->json(PaymentCategory::orderBy('id')->get());
    }
}
