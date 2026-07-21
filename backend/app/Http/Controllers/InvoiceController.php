<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    /**
     * GET /api/invoices
     * List all invoices with optional search & filter.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::query()->orderBy('created_at', 'desc');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('student_name', 'like', "%{$search}%");
            });
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        $invoices = $query->withCount('items')->paginate(20);

        return response()->json($invoices);
    }

    /**
     * POST /api/invoices
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number'  => 'required|string|unique:invoices,invoice_number',
            'date'            => 'required|date',
            'due_date'        => 'required|date',
            'student_name'    => 'required|string|max:255',
            'student_level'   => 'required|string|max:100',
            'amount_received' => 'required|numeric|min:0',
            'notes'           => 'nullable|string',
            'items'           => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.amount'      => 'required|numeric|min:0',
            'items.*.status'      => 'required|in:Lunas,Belum Lunas',
        ]);

        DB::beginTransaction();
        try {
            // Calculate total from items
            $total = collect($validated['items'])->sum('amount');
            $validated['total_amount'] = $total;

            $invoice = Invoice::create($validated);

            foreach ($validated['items'] as $idx => $item) {
                $invoice->items()->create([
                    'description' => $item['description'],
                    'amount'      => $item['amount'],
                    'status'      => $item['status'],
                    'sort_order'  => $idx,
                ]);
            }

            DB::commit();
            return response()->json($invoice->load('items'), 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/invoices/{id}
     */
    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json($invoice->load('items'));
    }

    /**
     * PUT /api/invoices/{id}
     */
    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number'  => "required|string|unique:invoices,invoice_number,{$invoice->id}",
            'date'            => 'required|date',
            'due_date'        => 'required|date',
            'student_name'    => 'required|string|max:255',
            'student_level'   => 'required|string|max:100',
            'amount_received' => 'required|numeric|min:0',
            'notes'           => 'nullable|string',
            'items'           => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.amount'      => 'required|numeric|min:0',
            'items.*.status'      => 'required|in:Lunas,Belum Lunas',
        ]);

        DB::beginTransaction();
        try {
            $total = collect($validated['items'])->sum('amount');
            $validated['total_amount'] = $total;

            $invoice->update($validated);

            // Replace all items
            $invoice->items()->delete();
            foreach ($validated['items'] as $idx => $item) {
                $invoice->items()->create([
                    'description' => $item['description'],
                    'amount'      => $item['amount'],
                    'status'      => $item['status'],
                    'sort_order'  => $idx,
                ]);
            }

            DB::commit();
            return response()->json($invoice->fresh('items'));
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/invoices/{id}
     */
    public function destroy(Invoice $invoice): JsonResponse
    {
        $invoice->items()->delete();
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted.']);
    }

    /**
     * GET /api/invoices/next-number
     * Generate next invoice number based on current month/year.
     */
    public function nextNumber(): JsonResponse
    {
        $now      = Carbon::now();
        $month    = $now->format('m');
        $romanMap = ['01'=>'I','02'=>'II','03'=>'III','04'=>'IV','05'=>'V','06'=>'VI',
                     '07'=>'VII','08'=>'VIII','09'=>'IX','10'=>'X','11'=>'XI','12'=>'XII'];
        $roman    = $romanMap[$month];
        $year     = $now->format('Y');
        $prefix   = "JCS/INV/{$roman}/{$year}";

        $last = Invoice::where('invoice_number', 'like', "%/{$roman}/{$year}")
                       ->orderBy('id', 'desc')
                       ->value('invoice_number');

        $seq = 1;
        if ($last) {
            preg_match('/^(\d+)\//', $last, $m);
            $seq = isset($m[1]) ? ((int) $m[1]) + 1 : 1;
        }

        $number = sprintf('%02d/%s', $seq, $prefix);
        return response()->json(['invoice_number' => $number]);
    }
}
