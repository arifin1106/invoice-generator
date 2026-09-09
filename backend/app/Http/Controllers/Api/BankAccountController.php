<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankAccountController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            BankAccount::orderBy('category')->orderBy('id')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bank_name'      => 'required|string|max:100',
            'account_number' => 'required|string|max:50',
            'account_name'   => 'required|string|max:100',
            'category'       => 'required|in:primary,preschool,umum',
        ]);

        $bank = BankAccount::create($validated);

        return response()->json($bank, 201);
    }

    public function update(Request $request, BankAccount $bankAccount): JsonResponse
    {
        $validated = $request->validate([
            'bank_name'      => 'sometimes|required|string|max:100',
            'account_number' => 'sometimes|required|string|max:50',
            'account_name'   => 'sometimes|required|string|max:100',
            'category'       => 'sometimes|required|in:primary,preschool,umum',
        ]);

        $bankAccount->update($validated);

        return response()->json($bankAccount);
    }

    public function destroy(BankAccount $bankAccount): JsonResponse
    {
        $bankAccount->delete();

        return response()->json(['message' => 'Rekening bank berhasil dihapus.']);
    }
}
