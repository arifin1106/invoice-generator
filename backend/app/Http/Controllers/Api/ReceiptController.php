<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;

class ReceiptController extends Controller
{
    /**
     * Display a listing of receipts.
     */
    public function index(Request $request)
    {
        $query = Receipt::query();

        if ($request->has('category')) {
            $query->where('payment_category', $request->category);
        }

        $receipts = $query->orderBy('date', 'desc')
                          ->orderBy('id', 'desc')
                          ->paginate(10);

        return response()->json($receipts);
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
