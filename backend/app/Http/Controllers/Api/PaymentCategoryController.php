<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentCategoryController extends Controller
{
    private const LEVEL_ORDER = ['P1', 'P2', 'K1', 'K2', 'Primary'];

    public function index(): JsonResponse
    {
        return response()->json($this->ordered());
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

        return response()->json($this->ordered());
    }

    private function ordered()
    {
        $rank = array_flip(self::LEVEL_ORDER);

        return PaymentCategory::all()
            ->sortBy(fn (PaymentCategory $cat) => [$cat->name, $rank[$cat->student_level] ?? count($rank)])
            ->values();
    }
}
