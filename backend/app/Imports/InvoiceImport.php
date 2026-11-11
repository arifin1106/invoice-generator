<?php

namespace App\Imports;

use App\Models\BankAccount;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class InvoiceImport
{
    public array $errors = [];

    public int $imported = 0;

    public int $skipped = 0;

    /**
     * Kolom invoice dasar.
     */
    private const INVOICE_COLUMNS = [
        'invoice_number' => 'No. Invoice',
        'date' => 'Tanggal',
        'due_date' => 'Jatuh Tempo',
        'student_name' => 'Nama Siswa',
        'student_level' => 'Level',
        'notes' => 'Catatan',
    ];

    public function import(string $filePath): void
    {
        $spreadsheet = IOFactory::load($filePath);
        $spreadsheet->setActiveSheetIndex(0);

        // formatData=false agar angka & tanggal dibaca sebagai nilai mentah,
        // sehingga pemisah ribuan tidak merusak nominal.
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, false, false);

        if (count($rows) < 2) {
            return;
        }

        $headerRow = array_shift($rows);
        [$map, $categories] = $this->parseHeaders($headerRow);

        $missing = [];
        foreach (self::INVOICE_COLUMNS as $key => $label) {
            if ($key !== 'notes' && $map[$key] === null) {
                $missing[] = $label;
            }
        }

        if ($missing !== []) {
            throw new InvalidArgumentException(
                'Format file tidak sesuai template terbaru. Kolom tidak ditemukan: '.implode(', ', $missing).'.'
            );
        }

        if ($categories === []) {
            throw new InvalidArgumentException(
                'Format file tidak sesuai template terbaru. Tidak ada kolom kategori pembayaran (Harga Awal/Diskon/Dibayar).'
            );
        }

        $existing = array_fill_keys(Invoice::pluck('invoice_number')->all(), true);

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                $rowNum = $index + 2;

                $invNumber = $this->cell($row, $map['invoice_number']);
                $name = $this->cell($row, $map['student_name']);

                if ($invNumber === '' && $name === '') {
                    continue;
                }

                $level = $this->cell($row, $map['student_level']);
                $dateRaw = $this->cell($row, $map['date']);
                $dueDateRaw = $this->cell($row, $map['due_date']);

                if ($invNumber === '' || $name === '' || $level === '' || $dateRaw === '' || $dueDateRaw === '') {
                    $this->errors[] = "Baris {$rowNum}: No. Invoice, Nama Siswa, Level, Tanggal, dan Jatuh Tempo wajib diisi.";
                    $this->skipped++;

                    continue;
                }

                if (isset($existing[$invNumber])) {
                    $this->errors[] = "Baris {$rowNum}: No. Invoice '{$invNumber}' sudah ada, dilewati.";
                    $this->skipped++;

                    continue;
                }

                try {
                    $date = $this->parseDate($dateRaw);
                    $dueDate = $this->parseDate($dueDateRaw);
                } catch (\Throwable $e) {
                    $this->errors[] = "Baris {$rowNum}: Format tanggal tidak valid (gunakan DD/MM/YYYY).";
                    $this->skipped++;

                    continue;
                }

                [$items, $itemErrors] = $this->buildItems($row, $categories);

                if ($itemErrors !== []) {
                    $this->errors[] = "Baris {$rowNum}: ".implode(' ', $itemErrors);
                    $this->skipped++;

                    continue;
                }

                if ($items === []) {
                    $this->errors[] = "Baris {$rowNum}: tidak ada kategori dengan Harga Awal, dilewati.";
                    $this->skipped++;

                    continue;
                }

                $invoice = Invoice::create([
                    'invoice_number' => $invNumber,
                    'date' => $date,
                    'due_date' => $dueDate,
                    'student_name' => $name,
                    'student_level' => $level,
                    'bank_account_id' => $this->resolveBankId($level),
                    'total_amount' => 0,
                    'amount_received' => 0,
                    'notes' => $this->cell($row, $map['notes']) ?: null,
                ]);

                foreach ($items as $order => $payload) {
                    $item = $invoice->items()->create([
                        'description' => $payload['description'],
                        'amount' => $payload['amount'],
                        'discount_type' => $payload['discount_type'],
                        'discount_value' => $payload['discount_value'],
                        'sort_order' => $order,
                    ]);

                    if ($payload['paid'] > 0) {
                        $item->payments()->create([
                            'amount' => $payload['paid'],
                            'payment_date' => $date,
                            'notes' => null,
                        ]);
                    }
                }

                // Hook `saving` menghitung ulang total, amount_received, remaining_balance,
                // dan status (paid/partial/unpaid) beserta status tiap item.
                $invoice->load('items.payments');
                $invoice->save();

                $existing[$invNumber] = true;
                $this->imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            throw $e;
        }
    }

    /**
     * @return array{0: array<string, int|null>, 1: array<string, array<string, int>>}
     */
    private function parseHeaders(array $headerRow): array
    {
        $map = array_fill_keys(array_keys(self::INVOICE_COLUMNS), null);
        $categories = [];

        foreach ($headerRow as $index => $raw) {
            $raw = trim((string) $raw);
            if ($raw === '') {
                continue;
            }

            // Blok kategori: "<Nama Kategori> - <Jenis Kolom>".
            if (preg_match('/^(.*?)\s*-\s*(Harga Awal|Diskon\s*\(\s*%\s*\)|Diskon\s*\(\s*Rp\s*\)|Dibayar)\s*$/i', $raw, $matches)) {
                $category = trim($matches[1], " \t\n\r\0\x0B*");
                $kind = strtolower(preg_replace('/\s+/', ' ', $matches[2]) ?? $matches[2]);

                $key = match (true) {
                    str_contains($kind, 'harga awal') => 'amount',
                    str_contains($kind, '%') => 'percent',
                    str_contains($kind, 'rp') => 'fixed',
                    default => 'paid',
                };

                if ($category !== '') {
                    $categories[$category][$key] = $index;
                }

                continue;
            }

            $normalized = $this->normalizeHeader($raw);

            if (str_contains($normalized, 'no invoice') || str_contains($normalized, 'nomor invoice')) {
                $map['invoice_number'] = $index;
            } elseif (str_contains($normalized, 'jatuh tempo')) {
                $map['due_date'] = $index;
            } elseif (str_contains($normalized, 'tanggal')) {
                $map['date'] = $index;
            } elseif (str_contains($normalized, 'nama siswa')) {
                $map['student_name'] = $index;
            } elseif (str_starts_with($normalized, 'level')) {
                $map['student_level'] = $index;
            } elseif (str_contains($normalized, 'catatan')) {
                $map['notes'] = $index;
            }
        }

        return [$map, $categories];
    }

    /**
     * Bangun daftar item dari kolom kategori pada satu baris.
     *
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, string>}
     */
    private function buildItems(array $row, array $categories): array
    {
        $items = [];
        $errors = [];

        foreach ($categories as $category => $columns) {
            $amount = $this->parseNumber($this->cell($row, $columns['amount'] ?? null));
            $percent = $this->parseNumber($this->cell($row, $columns['percent'] ?? null));
            $fixed = $this->parseNumber($this->cell($row, $columns['fixed'] ?? null));
            $paid = $this->parseNumber($this->cell($row, $columns['paid'] ?? null));

            if ($amount < 0) {
                $errors[] = "Kategori '{$category}': Harga Awal tidak boleh negatif.";

                continue;
            }

            if ($amount <= 0) {
                if ($percent > 0 || $fixed > 0 || $paid > 0) {
                    $errors[] = "Kategori '{$category}': Diskon/Dibayar terisi tetapi Harga Awal kosong.";
                }

                continue;
            }

            if ($percent > 100) {
                $errors[] = "Kategori '{$category}': Diskon (%) tidak boleh lebih dari 100.";

                continue;
            }

            $discountType = null;
            $discountValue = null;

            if ($percent > 0) {
                $discountType = 'percentage';
                $discountValue = $percent;
            } elseif ($fixed > 0) {
                $discountType = 'fixed';
                $discountValue = $fixed;
            }

            $items[] = [
                'description' => $category,
                'amount' => $amount,
                'discount_type' => $discountType,
                'discount_value' => $discountValue,
                'paid' => max(0, $paid),
            ];
        }

        return [$items, $errors];
    }

    private function normalizeHeader(string $header): string
    {
        $h = strtolower($header);
        $h = str_replace(['*', '(', ')', ',', '/', '\\', '-', '.', ':', '&', '%'], ' ', $h);

        return trim(preg_replace('/\s+/', ' ', $h) ?? $h);
    }

    private function cell(array $row, ?int $index): string
    {
        if ($index === null) {
            return '';
        }

        $value = $row[$index] ?? '';

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return trim((string) $value);
    }

    /**
     * Baca nominal dari angka maupun teks ("Rp 5.000.000", "5,000,000", dsb).
     */
    private function parseNumber(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return 0.0;
        }

        $numeric = preg_replace('/[^0-9,.\-]/', '', $raw) ?? '';

        if (str_contains($numeric, ',') && str_contains($numeric, '.')) {
            // Pemisah ribuan titik, desimal koma (format Indonesia).
            $numeric = str_replace('.', '', $numeric);
            $numeric = str_replace(',', '.', $numeric);
        } elseif (str_contains($numeric, ',')) {
            $numeric = preg_match('/,\d{1,2}$/', $numeric)
                ? str_replace(',', '.', $numeric)
                : str_replace(',', '', $numeric);
        } elseif (preg_match('/^\d{1,3}(\.\d{3})+$/', $numeric)) {
            $numeric = str_replace('.', '', $numeric);
        }

        return (float) $numeric;
    }

    private function parseDate(string $raw): string
    {
        $raw = trim($raw);

        if ($raw === '') {
            throw new InvalidArgumentException('Tanggal kosong.');
        }

        if (is_numeric($raw)) {
            return Carbon::instance(Date::excelToDateTimeObject((float) $raw))->toDateString();
        }

        foreach (['d/m/Y', 'd-m-Y', 'Y-m-d', 'd/m/y', 'd-m-y'] as $format) {
            try {
                $parsed = Carbon::createFromFormat($format, $raw);
                if ($parsed !== false) {
                    return $parsed->toDateString();
                }
            } catch (\Throwable $e) {
                // Lanjut ke format berikutnya.
            }
        }

        return Carbon::parse($raw)->toDateString();
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
