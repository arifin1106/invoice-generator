<?php
namespace App\Imports;
use App\Models\Receipt;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ReceiptImport
{
    public array $errors = [];
    public int $imported = 0;
    public int $skipped  = 0;

    public function import(string $filePath): void
    {
        $spreadsheet = IOFactory::load($filePath);
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);
        array_shift($rows); // remove header row

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                $rowNum        = $index + 2;
                $receiptNumber = trim((string)($row[0] ?? ''));
                $dateRaw       = trim((string)($row[1] ?? ''));
                $receivedFrom  = trim((string)($row[2] ?? ''));
                $amount        = (float)($row[3] ?? 0);
                $amountWords   = trim((string)($row[4] ?? ''));
                $category      = trim((string)($row[5] ?? ''));
                $description   = trim((string)($row[6] ?? ''));

                if (empty($receiptNumber) || empty($receivedFrom)) {
                    $this->skipped++;
                    continue;
                }
                if (Receipt::where('receipt_number', $receiptNumber)->exists()) {
                    $this->errors[] = "Baris {$rowNum}: No. Kwitansi '{$receiptNumber}' sudah ada, dilewati.";
                    $this->skipped++;
                    continue;
                }

                try {
                    $date = Carbon::createFromFormat('d/m/Y', $dateRaw)->toDateString();
                } catch (\Exception $e) {
                    $this->errors[] = "Baris {$rowNum}: Format tanggal tidak valid (gunakan DD/MM/YYYY).";
                    $this->skipped++;
                    continue;
                }

                $validCategories = ['Seragam Sekolah', 'Cathering Makanan', 'Jemputan Sekolah', 'Lainnya'];
                $category = in_array($category, $validCategories) ? $category : 'Lainnya';

                if ($amount <= 0) {
                    $this->errors[] = "Baris {$rowNum}: Jumlah harus lebih dari 0, dilewati.";
                    $this->skipped++;
                    continue;
                }

                // Auto-generate terbilang if not provided
                if (empty($amountWords)) {
                    $amountWords = $this->terbilang($amount) . ' Rupiah';
                }

                Receipt::create([
                    'receipt_number'   => $receiptNumber,
                    'date'             => $date,
                    'received_from'    => $receivedFrom,
                    'amount'           => $amount,
                    'amount_in_words'  => $amountWords,
                    'payment_category' => $category,
                    'description'      => $description,
                ]);
                $this->imported++;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function terbilang($angka)
    {
        $angka = abs((float)$angka);
        $baca = array("", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas");
        $terbilang = "";

        if ($angka < 12) {
            $terbilang = " " . $baca[(int)$angka];
        } else if ($angka < 20) {
            $terbilang = $this->terbilang($angka - 10) . " Belas";
        } else if ($angka < 100) {
            $terbilang = $this->terbilang((int)($angka / 10)) . " Puluh" . $this->terbilang($angka % 10);
        } else if ($angka < 200) {
            $terbilang = " Seratus" . $this->terbilang($angka - 100);
        } else if ($angka < 1000) {
            $terbilang = $this->terbilang((int)($angka / 100)) . " Ratus" . $this->terbilang($angka % 100);
        } else if ($angka < 2000) {
            $terbilang = " Seribu" . $this->terbilang($angka - 1000);
        } else if ($angka < 1000000) {
            $terbilang = $this->terbilang((int)($angka / 1000)) . " Ribu" . $this->terbilang($angka % 1000);
        } else if ($angka < 1000000000) {
            $terbilang = $this->terbilang((int)($angka / 1000000)) . " Juta" . $this->terbilang($angka % 1000000);
        } else if ($angka < 1000000000000) {
            $terbilang = $this->terbilang((int)($angka / 1000000000)) . " Milyar" . $this->terbilang(fmod($angka, 1000000000));
        } else if ($angka < 1000000000000000) {
            $terbilang = $this->terbilang((int)($angka / 1000000000000)) . " Trilyun" . $this->terbilang(fmod($angka, 1000000000000));
        }

        return trim($terbilang);
    }
}
