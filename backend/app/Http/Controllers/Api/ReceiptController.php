<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

class ReceiptController extends Controller
{
    private const SHARE_URL_DAYS = 7;

    /**
     * Display a listing of receipts.
     */
    public function index(Request $request)
    {
        $query = Receipt::query();

        if ($request->filled('category')) {
            $query->where('payment_category', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('receipt_number', 'like', "%{$search}%")
                  ->orWhere('received_from', 'like', "%{$search}%");
            });
        }

        $receipts = $query->orderBy('date', 'desc')
                          ->orderBy('id', 'desc')
                          ->paginate(10);

        // Get total stats (independent of pagination and search/category filters if we want overall stats, 
        // but maybe we just get overall stats)
        $totalKwitansi = Receipt::count();
        $totalSeragam = Receipt::where('payment_category', 'Seragam Sekolah')->count();
        $totalCathering = Receipt::where('payment_category', 'Cathering Makanan')->count();
        $totalJemputan = Receipt::where('payment_category', 'Jemputan Sekolah')->count();

        return response()->json([
            'current_page' => $receipts->currentPage(),
            'data' => $receipts->items(),
            'first_page_url' => $receipts->url(1),
            'from' => $receipts->firstItem(),
            'last_page' => $receipts->lastPage(),
            'last_page_url' => $receipts->url($receipts->lastPage()),
            'links' => $receipts->linkCollection()->toArray(),
            'next_page_url' => $receipts->nextPageUrl(),
            'path' => $receipts->path(),
            'per_page' => $receipts->perPage(),
            'prev_page_url' => $receipts->previousPageUrl(),
            'to' => $receipts->lastItem(),
            'total' => $receipts->total(),
            'stats' => [
                'total' => $totalKwitansi,
                'seragam' => $totalSeragam,
                'cathering' => $totalCathering,
                'jemputan' => $totalJemputan,
            ]
        ]);
    }

    /**
     * Store a newly created receipt in storage.
     */
    public function store(Request $request)
    {
        $validated = $this->validateReceipt($request);

        // Auto generate amount in words if not provided or to ensure accuracy
        $validated['amount_in_words'] = $this->terbilang($validated['amount']) . ' Rupiah';

        $receipt = Receipt::create($validated);

        return response()->json([
            'message' => 'Kwitansi berhasil dibuat.',
            'data'    => $receipt
        ], 201);
    }

    /**
     * Display the specified receipt.
     */
    public function show(Receipt $receipt)
    {
        return response()->json($receipt);
    }

    /**
     * Update the specified receipt in storage.
     */
    public function update(Request $request, Receipt $receipt)
    {
        $validated = $this->validateReceipt($request, $receipt->id);

        $validated['amount_in_words'] = $this->terbilang($validated['amount']) . ' Rupiah';

        $receipt->update($validated);

        return response()->json([
            'message' => 'Kwitansi berhasil diupdate.',
            'data'    => $receipt
        ]);
    }

    /**
     * Remove the specified receipt from storage.
     */
    public function destroy(Receipt $receipt)
    {
        $receipt->delete();

        return response()->json([
            'message' => 'Kwitansi berhasil dihapus.'
        ]);
    }

    /**
     * Generate auto receipt number.
     */
    public function generateNumber()
    {
        $lastReceipt = Receipt::orderBy('id', 'desc')->first();
        
        $nextId = $lastReceipt ? $lastReceipt->id + 1 : 1;
        
        $number = 'KWT-' . date('Ymd') . '-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);

        return response()->json(['receipt_number' => $number]);
    }

    /**
     * Download PDF for receipt.
     */
    public function downloadPdf(Receipt $receipt)
    {
        $pdf = Pdf::loadView('receipts.pdf', compact('receipt'));
        $pdf->setPaper('A4', 'landscape'); // Kwitansi usually half A4 or landscape
        
        return $pdf->download('Kwitansi-' . str_replace('/', '-', $receipt->receipt_number) . '.pdf');
    }

    /**
     * Generate signed public share URL for receipt PDF.
     */
    public function shareUrl(Receipt $receipt): JsonResponse
    {
        $expiresAt = now()->addDays(self::SHARE_URL_DAYS);

        return response()->json([
            'url'        => URL::temporarySignedRoute('public.receipts.pdf', $expiresAt, ['receipt' => $receipt->id]),
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    /**
     * Public (signed) PDF download — same output as authenticated download.
     */
    public function publicPdf(Receipt $receipt)
    {
        return $this->downloadPdf($receipt);
    }

    /**
     * Validation rules for receipt.
     */
    private function validateReceipt(Request $request, $id = null)
    {
        return $request->validate([
            'receipt_number'   => 'required|string|unique:receipts,receipt_number,' . $id,
            'date'             => 'required|date',
            'received_from'    => 'required|string|max:255',
            'amount'           => 'required|numeric|min:0',
            'payment_category' => 'required|string',
            'description'      => 'nullable|string',
        ]);
    }

    /**
     * Fungsi terbilang bahasa Indonesia.
     */
    private function terbilang($angka)
    {
        $angka = abs((float)$angka);
        $baca = array("", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas");
        $terbilang = "";

        if ($angka < 12) {
            $terbilang = " " . $baca[$angka];
        } else if ($angka < 20) {
            $terbilang = $this->terbilang($angka - 10) . " Belas";
        } else if ($angka < 100) {
            $terbilang = $this->terbilang($angka / 10) . " Puluh" . $this->terbilang($angka % 10);
        } else if ($angka < 200) {
            $terbilang = " Seratus" . $this->terbilang($angka - 100);
        } else if ($angka < 1000) {
            $terbilang = $this->terbilang($angka / 100) . " Ratus" . $this->terbilang($angka % 100);
        } else if ($angka < 2000) {
            $terbilang = " Seribu" . $this->terbilang($angka - 1000);
        } else if ($angka < 1000000) {
            $terbilang = $this->terbilang($angka / 1000) . " Ribu" . $this->terbilang($angka % 1000);
        } else if ($angka < 1000000000) {
            $terbilang = $this->terbilang($angka / 1000000) . " Juta" . $this->terbilang($angka % 1000000);
        } else if ($angka < 1000000000000) {
            $terbilang = $this->terbilang($angka / 1000000000) . " Milyar" . $this->terbilang(fmod($angka, 1000000000));
        } else if ($angka < 1000000000000000) {
            $terbilang = $this->terbilang($angka / 1000000000000) . " Trilyun" . $this->terbilang(fmod($angka, 1000000000000));
        }

        return trim($terbilang);
    }
}
