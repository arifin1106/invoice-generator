<?php

namespace App\Imports;

use App\Models\BankAccount;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class InvoiceImport
{
    public array $errors = [];

    public int $imported = 0;

    public int $skipped = 0;

    public function import(string $filePath): void
    {
        $spreadsheet = IOFactory::load($filePath);
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        if (count($rows) < 2) {
            return;
        }

        // Petakan kolom berdasarkan nama header (mendukung format template dan export).
        $headers = array_map(fn ($h) => $this->normalizeHeader((string) $h), array_shift($rows));
        $col = $this->mapColumns($headers);

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                $rowNum = $index + 2;

                $invNumber = $this->cell($row, $col['invoice_number']);
                $dateRaw = $this->cell($row, $col['date']);
                $dueDateRaw = $this->cell($row, $col['due_date']);
                $name = $this->cell($row, $col['student_name']);
                $level = $this->cell($row, $col['student_level']);
                $total = (float) $this->cell($row, $col['total']);
                $received = (float) $this->cell($row, $col['received']);
                $notes = $this->cell($row, $col['notes']);

                if ($invNumber === '' || $name === '') {
                    $this->skipped++;

                    continue;
                }

                if (Invoice::where('invoice_number', $invNumber)->exists()) {
                    $this->errors[] = "Baris {$rowNum}: No. Invoice '{$invNumber}' sudah ada, dilewati.";
                    $this->skipped++;

                    continue;
                }

                try {
                    $date = $this->parseDate($dateRaw);
                    $dueDate = $this->parseDate($dueDateRaw);
                } catch (\Exception $e) {
                    $this->errors[] = "Baris {$rowNum}: Format tanggal tidak valid (gunakan DD/MM/YYYY).";
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
                    'notes' => $notes !== '' ? $notes : null,
                ]);

                $item = $invoice->items()->create([
                    'description' => 'Biaya Pendidikan',
                    'amount' => $total,
                    'sort_order' => 0,
                ]);

                if ($received > 0) {
                    $item->payments()->create([
                        'amount' => $received,
                        'payment_date' => $date,
                        'notes' => null,
                    ]);
                }

                // Hook `saving` menghitung ulang total, amount_received, remaining_balance
                // dan status (paid/partial/unpaid) beserta status tiap item.
                $invoice->load('items.payments');
                $invoice->save();

                $this->imported++;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function normalizeHeader(string $header): string
    {
        $h = strtolower($header);
        $h = str_replace(['*', '(', ')', ',', '/', '\\', '-', '.', ':', '&'], ' ', $h);

        return trim(preg_replace('/\s+/', ' ', $h) ?? $h);
    }

    private function mapColumns(array $headers): array
    {
        $col = [
            'invoice_number' => null,
            'date' => null,
            'due_date' => null,
            'student_name' => null,
            'student_level' => null,
            'total' => null,
            'received' => null,
            'notes' => null,
        ];

        foreach ($headers as $i => $h) {
            if ($h === '') {
                continue;
            }

            if (str_contains($h, 'no invoice')) {
                $col['invoice_number'] = $i;
            } elseif (str_contains($h, 'jatuh tempo')) {
                $col['due_date'] = $i;
            } elseif (str_contains($h, 'tanggal')) {
                $col['date'] = $i;
            } elseif (str_contains($h, 'nama siswa')) {
                $col['student_name'] = $i;
            } elseif (str_starts_with($h, 'level')) {
                $col['student_level'] = $i;
            } elseif (str_contains($h, 'total tagihan') || str_contains($h, 'total')) {
                $col['total'] = $i;
            } elseif (str_contains($h, 'terbayar')) {
                $col['received'] = $i;
            } elseif (str_contains($h, 'catatan')) {
                $col['notes'] = $i;
            }
        }

        return $col;
    }

    private function cell(array $row, ?int $index): string
    {
        return trim((string) ($row[$index] ?? ''));
    }

    private function parseDate(string $raw): string
    {
        try {
            return Carbon::createFromFormat('d/m/Y', $raw)->toDateString();
        } catch (\Exception $e) {
            // Lanjut ke fallback di bawah.
        }

        if (is_numeric($raw)) {
            return Carbon::instance(Date::excelToDateTimeObject($raw))->toDateString();
        }

        $parsed = Carbon::parse($raw);

        return $parsed->toDateString();
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
