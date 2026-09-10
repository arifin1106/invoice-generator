<?php
namespace App\Imports;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class InvoiceImport
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
                $rowNum = $index + 2;
                $invNumber  = trim((string)($row[0] ?? ''));
                $dateRaw    = trim((string)($row[1] ?? ''));
                $dueDateRaw = trim((string)($row[2] ?? ''));
                $name       = trim((string)($row[3] ?? ''));
                $level      = trim((string)($row[4] ?? ''));
                $total      = (float)($row[5] ?? 0);
                $received   = (float)($row[6] ?? 0);
                $statusRaw  = strtolower(trim((string)($row[7] ?? 'unpaid')));
                $notes      = trim((string)($row[8] ?? ''));

                if (empty($invNumber) || empty($name)) { $this->skipped++; continue; }
                if (Invoice::where('invoice_number', $invNumber)->exists()) { $this->errors[] = "Baris {$rowNum}: No. Invoice '{$invNumber}' sudah ada, dilewati."; $this->skipped++; continue; }

                try {
                    $date    = Carbon::createFromFormat('d/m/Y', $dateRaw)->toDateString();
                    $dueDate = Carbon::createFromFormat('d/m/Y', $dueDateRaw)->toDateString();
                } catch (\Exception $e) {
                    $this->errors[] = "Baris {$rowNum}: Format tanggal tidak valid (gunakan DD/MM/YYYY).";
                    $this->skipped++; continue;
                }

                $statusMap = ['lunas' => 'paid', 'sebagian' => 'partial', 'belum lunas' => 'unpaid', 'paid' => 'paid', 'partial' => 'partial', 'unpaid' => 'unpaid'];
                $status = $statusMap[$statusRaw] ?? 'unpaid';
                $remaining = $total - $received;

                Invoice::create([
                    'invoice_number'    => $invNumber,
                    'date'              => $date,
                    'due_date'          => $dueDate,
                    'student_name'      => $name,
                    'student_level'     => $level,
                    'total_amount'      => $total,
                    'amount_received'   => $received,
                    'remaining_balance' => $remaining < 0 ? 0 : $remaining,
                    'status'            => $status,
                    'notes'             => $notes,
                ]);
                $this->imported++;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}