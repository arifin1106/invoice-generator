<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\BankAccount;
use App\Models\Payment;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

class InvoiceController extends Controller
{
    private const SHARE_URL_DAYS = 7;

    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with('items', 'bankAccount');

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(student_name) LIKE ?', ["%{$search}%"])
                  ->orWhereRaw('LOWER(invoice_number) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('student_level')) {
            $levels = explode(',', $request->student_level);
            $query->whereIn('student_level', $levels);
        }

        $invoices = $query->orderBy('id', 'asc')->paginate($request->get('per_page', 15));

        $statsQuery = Invoice::query();
        if ($request->filled('student_level')) {
            $levels = explode(',', $request->student_level);
            $statsQuery->whereIn('student_level', $levels);
        }

        $response = $invoices->toArray();
        $response['stats'] = [
            'paid'    => (clone $statsQuery)->where('status', 'paid')->count(),
            'partial' => (clone $statsQuery)->where('status', 'partial')->count(),
            'unpaid'  => (clone $statsQuery)->where('status', 'unpaid')->count(),
            'revenue' => (clone $statsQuery)->sum('amount_received'),
        ];

        $monthlyQuery = Invoice::selectRaw("TO_CHAR(date, 'YYYY-MM') as month, SUM(total_amount) as total, SUM(amount_received) as received, COUNT(*) as count")
            ->where('date', '>=', now()->subMonths(11)->startOfMonth());
        if ($request->filled('student_level')) {
            $levels = explode(',', $request->student_level);
            $monthlyQuery->whereIn('student_level', $levels);
        }
        $response['monthly_data'] = $monthlyQuery->groupBy('month')->orderBy('month')->get();

        return response()->json($response);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number'      => 'required|string|unique:invoices',
            'date'                => 'required|date',
            'due_date'            => 'required|date',
            'student_name'        => 'required|string|max:255',
            'student_level'       => 'required|string|max:50',
            'bank_account_id'     => 'nullable|exists:bank_accounts,id',
            'notes'               => 'nullable|string',
            'items'               => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.amount'      => 'required|numeric|min:0',
            'items.*.discount_type'  => 'nullable|in:percentage,fixed',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'items.*.payments'       => 'nullable|array',
            'items.*.payments.*.amount'      => 'required_with:items.*.payments|numeric|min:0',
            'items.*.payments.*.payment_date' => 'required_with:items.*.payments|date',
            'items.*.payments.*.notes'         => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $invoice = Invoice::create([
                'invoice_number' => $validated['invoice_number'],
                'date'           => $validated['date'],
                'due_date'       => $validated['due_date'],
                'student_name'   => $validated['student_name'],
                'student_level'  => $validated['student_level'],
                'bank_account_id' => $validated['bank_account_id']
                    ?? $this->resolveBankId($validated['student_level']),
                'total_amount'   => 0,
                'amount_received' => 0,
                'notes'          => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $index => $item) {
                $invoiceItem = $invoice->items()->create([
                    'description'    => $item['description'],
                    'amount'         => $item['amount'],
                    'discount_type'  => $item['discount_type'] ?? null,
                    'discount_value' => $item['discount_value'] ?? null,
                    'sort_order'     => $index,
                ]);

                if (!empty($item['payments'])) {
                    foreach ($item['payments'] as $payment) {
                        $invoiceItem->payments()->create([
                            'amount'       => $payment['amount'],
                            'payment_date' => $payment['payment_date'],
                            'notes'        => $payment['notes'] ?? null,
                        ]);
                    }
                }
            }

            $invoice->load('items.payments');
            $invoice->save();

            DB::commit();
            return response()->json($invoice, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menyimpan invoice: ' . $e->getMessage()], 500);
        }
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load('items.payments', 'bankAccount');

        if (!$invoice->bank_account_id) {
            $bank = $invoice->resolveBankAccount();
            if ($bank) {
                $invoice->bank_account_id = $bank->id;
                $invoice->setRelation('bankAccount', $bank);
                $invoice->saveQuietly();
            }
        }

        return response()->json($invoice);
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number'      => 'required|string|unique:invoices,invoice_number,' . $invoice->id,
            'date'                => 'required|date',
            'due_date'            => 'required|date',
            'student_name'        => 'required|string|max:255',
            'student_level'       => 'required|string|max:50',
            'bank_account_id'     => 'nullable|exists:bank_accounts,id',
            'notes'               => 'nullable|string',
            'items'               => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.amount'      => 'required|numeric|min:0',
            'items.*.discount_type'  => 'nullable|in:percentage,fixed',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'items.*.payments'       => 'nullable|array',
            'items.*.payments.*.id'             => 'nullable|integer',
            'items.*.payments.*.amount'         => 'required_with:items.*.payments|numeric|min:0',
            'items.*.payments.*.payment_date'   => 'required_with:items.*.payments|date',
            'items.*.payments.*.notes'           => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $invoice->update([
                'invoice_number' => $validated['invoice_number'],
                'date'           => $validated['date'],
                'due_date'       => $validated['due_date'],
                'student_name'   => $validated['student_name'],
                'student_level'  => $validated['student_level'],
                'bank_account_id' => $validated['bank_account_id']
                    ?? $this->resolveBankId($validated['student_level']),
                'total_amount'   => 0,
                'amount_received' => 0,
                'notes'          => $validated['notes'] ?? null,
            ]);

            $invoice->items()->delete();
            foreach ($validated['items'] as $index => $item) {
                $invoiceItem = $invoice->items()->create([
                    'description'    => $item['description'],
                    'amount'         => $item['amount'],
                    'discount_type'  => $item['discount_type'] ?? null,
                    'discount_value' => $item['discount_value'] ?? null,
                    'sort_order'     => $index,
                ]);

                if (!empty($item['payments'])) {
                    foreach ($item['payments'] as $payment) {
                        $invoiceItem->payments()->create([
                            'amount'       => $payment['amount'],
                            'payment_date' => $payment['payment_date'],
                            'notes'        => $payment['notes'] ?? null,
                        ]);
                    }
                }
            }

            $invoice->load('items.payments', 'bankAccount');
            $invoice->save();

            DB::commit();
            return response()->json($invoice);
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
            $invoice->load('items.payments');
            $setting = Setting::first();

            $bank = $invoice->resolveBankAccount();

            $pdf = Pdf::loadView('invoice-pdf', compact('invoice', 'setting', 'bank'))
                ->setPaper('a4', 'portrait');

            $filename = 'Invoice-' . str_replace('/', '-', $invoice->invoice_number) . '.pdf';
            return $pdf->download($filename);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'PDF Error: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    public function shareUrl(Invoice $invoice): JsonResponse
    {
        $expiresAt = now()->addDays(self::SHARE_URL_DAYS);

        return response()->json([
            'url'        => URL::temporarySignedRoute('public.invoices.pdf', $expiresAt, ['invoice' => $invoice->id]),
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    public function publicPdf(Invoice $invoice)
    {
        return $this->downloadPdf($invoice);
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

        $setting = Setting::first();
        $number  = $setting->next_invoice_number;
        $setting->increment('next_invoice_number');

        $invoiceNumber = sprintf('%02d/JACOS/INV/%s/%s', $number, $romanMonth[$month], $year);

        return response()->json(['invoice_number' => $invoiceNumber]);
    }

    private function resolveBankId(string $studentLevel): ?int
    {
        $category = in_array($studentLevel, ['P1', 'P2', 'K1', 'K2'], true)
            ? 'preschool'
            : 'primary';

        return BankAccount::where('category', $category)->value('id')
            ?? BankAccount::where('category', 'umum')->value('id');
    }
}
