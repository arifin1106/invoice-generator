<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with('items');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('student_name', 'like', "%{$search}%")
                  ->orWhere('invoice_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $invoices = $query->latest()->paginate($request->get('per_page', 15));

        return response()->json($invoices);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number'  => 'required|string|unique:invoices',
            'date'            => 'required|date',
            'due_date'        => 'required|date',
            'student_name'    => 'required|string|max:255',
            'student_level'   => 'required|string|max:50',
            'amount_received' => 'required|numeric|min:0',
            'notes'           => 'nullable|string',
            'items'           => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.amount'      => 'required|numeric|min:0',
            'items.*.status'      => 'required|in:Lunas,Belum Lunas',
        ]);

        DB::beginTransaction();
        try {
            $totalAmount = collect($validated['items'])->sum('amount');

            $invoice = Invoice::create([
                'invoice_number'  => $validated['invoice_number'],
                'date'            => $validated['date'],
                'due_date'        => $validated['due_date'],
                'student_name'    => $validated['student_name'],
                'student_level'   => $validated['student_level'],
                'total_amount'    => $totalAmount,
                'amount_received' => $validated['amount_received'],
                'notes'           => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $index => $item) {
                $invoice->items()->create([
                    'description' => $item['description'],
                    'amount'      => $item['amount'],
                    'status'      => $item['status'],
                    'sort_order'  => $index,
                ]);
            }

            DB::commit();
            return response()->json($invoice->load('items'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menyimpan invoice: ' . $e->getMessage()], 500);
        }
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json($invoice->load('items'));
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number'  => 'required|string|unique:invoices,invoice_number,' . $invoice->id,
            'date'            => 'required|date',
            'due_date'        => 'required|date',
            'student_name'    => 'required|string|max:255',
            'student_level'   => 'required|string|max:50',
            'amount_received' => 'required|numeric|min:0',
            'notes'           => 'nullable|string',
            'items'           => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.amount'      => 'required|numeric|min:0',
            'items.*.status'      => 'required|in:Lunas,Belum Lunas',
        ]);

        DB::beginTransaction();
        try {
            $totalAmount = collect($validated['items'])->sum('amount');

            $invoice->update([
                'invoice_number'  => $validated['invoice_number'],
                'date'            => $validated['date'],
                'due_date'        => $validated['due_date'],
                'student_name'    => $validated['student_name'],
                'student_level'   => $validated['student_level'],
                'total_amount'    => $totalAmount,
                'amount_received' => $validated['amount_received'],
                'notes'           => $validated['notes'] ?? null,
            ]);

            $invoice->items()->delete();
            foreach ($validated['items'] as $index => $item) {
                $invoice->items()->create([
                    'description' => $item['description'],
                    'amount'      => $item['amount'],
                    'status'      => $item['status'],
                    'sort_order'  => $index,
                ]);
            }

            DB::commit();
            return response()->json($invoice->load('items'));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal mengupdate invoice: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        $invoice->delete();
        return response()->json(['message' => 'Invoice berhasil dihapus.']);
    }

    public function downloadPdf(Invoice $invoice)
    {
        try {
            $invoice->load('items');
            $setting = Setting::first();

            $pdf = Pdf::loadView('invoice-pdf', compact('invoice', 'setting'))
                ->setPaper('a4', 'portrait');

            $filename = 'Invoice-' . str_replace('/', '-', $invoice->invoice_number) . '.pdf';
            return $pdf->download($filename);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'PDF Error: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    public function generateNumber(): JsonResponse
    {
        $now   = now();
        $month = $now->format('m');
        $year  = $now->format('Y');

        $romanMonth = [
            '01' => 'I',   '02' => 'II',  '03' => 'III', '04' => 'IV',
            '05' => 'V',   '06' => 'VI',  '07' => 'VII', '08' => 'VIII',
            '09' => 'IX',  '10' => 'X',   '11' => 'XI',  '12' => 'XII',
        ];

        $count = Invoice::whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->count() + 1;

        $number = sprintf('%02d/JACOS/INV/%s/%s', $count, $romanMonth[$month], $year);

        return response()->json(['invoice_number' => $number]);
    }
}
