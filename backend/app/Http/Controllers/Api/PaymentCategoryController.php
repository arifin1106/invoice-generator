<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
            'categories' => 'required|array|min:1',
            'categories.*.id' => 'required|integer|exists:payment_categories',
            'categories.*.default_amount' => 'required|numeric|min:0',
        ]);

        foreach ($validated['categories'] as $cat) {
            PaymentCategory::where('id', $cat['id'])->update([
                'default_amount' => $cat['default_amount'],
            ]);
        }

        return response()->json($this->ordered());
    }

    public function storeGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'default_amount' => 'nullable|numeric|min:0',
        ]);

        $name = trim($validated['name']);

        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'Nama kategori wajib diisi.']);
        }

        if ($this->nameExists($name)) {
            throw ValidationException::withMessages(['name' => 'Nama kategori sudah ada.']);
        }

        $amount = $validated['default_amount'] ?? 0;

        DB::transaction(function () use ($name, $amount) {
            foreach (self::LEVEL_ORDER as $level) {
                PaymentCategory::updateOrCreate(
                    ['name' => $name, 'student_level' => $level],
                    ['default_amount' => $amount, 'is_active' => true]
                );
            }
        });

        return response()->json($this->ordered(), 201);
    }

    public function updateGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'original_name' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $original = trim($validated['original_name']);
        $name = trim($validated['name']);

        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'Nama kategori wajib diisi.']);
        }

        $rows = PaymentCategory::where('name', $original)->get();

        if ($rows->isEmpty()) {
            abort(404, 'Kategori tidak ditemukan.');
        }

        if (strcasecmp($name, $original) !== 0 && $this->nameExists($name, $original)) {
            throw ValidationException::withMessages(['name' => 'Nama kategori sudah ada.']);
        }

        DB::transaction(function () use ($rows, $name, $request, $validated) {
            foreach ($rows as $row) {
                $row->name = $name;

                if ($request->has('is_active')) {
                    $row->is_active = (bool) $validated['is_active'];
                }

                $row->save();
            }
        });

        return response()->json($this->ordered());
    }

    public function destroyGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $deleted = PaymentCategory::where('name', trim($validated['name']))->delete();

        if ($deleted === 0) {
            abort(404, 'Kategori tidak ditemukan.');
        }

        return response()->json($this->ordered());
    }

    private function nameExists(string $name, ?string $except = null): bool
    {
        return PaymentCategory::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($except !== null, fn ($query) => $query->whereRaw('LOWER(name) <> ?', [mb_strtolower($except)]))
            ->exists();
    }

    private function ordered()
    {
        $rank = array_flip(self::LEVEL_ORDER);

        return PaymentCategory::all()
            ->sortBy(fn (PaymentCategory $cat) => [$cat->name, $rank[$cat->student_level] ?? count($rank)])
            ->values();
    }
}
