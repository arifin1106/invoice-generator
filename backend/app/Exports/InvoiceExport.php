<?php

namespace App\Exports;

use App\Models\Invoice;
use App\Models\PaymentCategory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;

class InvoiceExport
{
    protected ?string $studentLevel;

    private const VALID_LEVELS = ['P1', 'P2', 'K1', 'K2', 'Primary'];

    /**
     * Suffix kolom untuk setiap kategori pembayaran.
     */
    private const CATEGORY_KINDS = [
        'amount' => 'Harga Awal',
        'percent' => 'Diskon (%)',
        'fixed' => 'Diskon (Rp)',
        'paid' => 'Dibayar',
    ];

    /**
     * Kolom ringkasan tingkat invoice (dihitung otomatis, diabaikan saat import).
     */
    private const SUMMARY_COLUMNS = [
        'Subtotal Harga Awal',
        'Total Diskon',
        'Total Tagihan',
        'Total Dibayar',
        'Sisa Tagihan',
        'Status',
        'Catatan',
    ];

    private const STATUS_LABELS = [
        'paid' => 'Lunas',
        'partial' => 'Sebagian',
        'unpaid' => 'Belum Lunas',
    ];

    public function __construct(?string $studentLevel = null)
    {
        $this->studentLevel = $studentLevel;
    }

    public function download(): Response
    {
        $spreadsheet = $this->build();
        $writer = new Xlsx($spreadsheet);
        $filename = 'Invoice-Export-'.now()->format('Y-m-d').'.xlsx';

        return response()->stream(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    protected function build(): Spreadsheet
    {
        $query = Invoice::query()->with(['items.payments'])->orderBy('id', 'asc');
        $levels = $this->levels();

        if ($levels !== []) {
            $query->where(function ($q) use ($levels) {
                foreach ($levels as $level) {
                    $q->orWhereRaw('LOWER(student_level) LIKE ?', ['%'.strtolower($level).'%']);
                }
            });
        }

        $invoices = $query->get();
        $categories = $this->exportCategories($invoices);
        $columns = $this->columns($categories);

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Invoice');

        $this->writeHeader($sheet, $columns);

        $row = 2;
        foreach ($invoices as $invoice) {
            $aggregated = $this->aggregateItems($invoice);

            $this->setValues($sheet, $row, [
                1 => $invoice->invoice_number,
                2 => $invoice->date ? $invoice->date->format('d/m/Y') : '',
                3 => $invoice->due_date ? $invoice->due_date->format('d/m/Y') : '',
                4 => $invoice->student_name,
                5 => $invoice->student_level,
            ]);

            $subtotal = 0.0;
            $totalDiscount = 0.0;
            $totalPaid = 0.0;

            foreach ($categories as $category) {
                $data = $aggregated[$category] ?? null;
                $amount = (float) ($data['amount'] ?? 0);
                $discount = (float) ($data['discount'] ?? 0);
                $paid = (float) ($data['paid'] ?? 0);

                $subtotal += $amount;
                $totalDiscount += $discount;
                $totalPaid += $paid;

                $percent = null;
                $fixed = null;
                if ($data && $data['type'] === 'percentage') {
                    $percent = (float) $data['value'];
                    $fixed = $discount;
                } elseif ($data && $data['type'] === 'fixed') {
                    $fixed = (float) $data['value'];
                }

                $this->setValues($sheet, $row, [
                    $columns['category'][$category]['amount'] => $amount > 0 ? $amount : null,
                    $columns['category'][$category]['percent'] => $percent,
                    $columns['category'][$category]['fixed'] => $fixed,
                    $columns['category'][$category]['paid'] => $paid > 0 ? $paid : null,
                ]);
            }

            $this->setValues($sheet, $row, [
                $columns['summary']['Subtotal Harga Awal'] => $subtotal,
                $columns['summary']['Total Diskon'] => $totalDiscount,
                $columns['summary']['Total Tagihan'] => (float) $invoice->total_amount,
                $columns['summary']['Total Dibayar'] => (float) $invoice->amount_received,
                $columns['summary']['Sisa Tagihan'] => (float) $invoice->remaining_balance,
                $columns['summary']['Status'] => self::STATUS_LABELS[$invoice->status] ?? $invoice->status,
                $columns['summary']['Catatan'] => $invoice->notes,
            ]);

            if ($row % 2 === 0) {
                $sheet->getStyle([1, $row, $columns['last'], $row])
                    ->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('f0f4f8');
            }

            $row++;
        }

        $lastRow = max(2, $row - 1);

        foreach ($columns['money'] as $col) {
            $sheet->getStyle([$col, 2, $col, $lastRow])
                ->getNumberFormat()->setFormatCode('#,##0');
        }
        foreach ($columns['percent'] as $col) {
            $sheet->getStyle([$col, 2, $col, $lastRow])
                ->getNumberFormat()->setFormatCode('#,##0.##');
        }

        $sheet->getStyle([1, 1, $columns['last'], $lastRow])
            ->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        $lastColumnLetter = Coordinate::stringFromColumnIndex($columns['last']);
        $sheet->setAutoFilter("A1:{$lastColumnLetter}1");
        $sheet->freezePane('F2');

        return $spreadsheet;
    }

    public static function template(?string $studentLevel = null): Response
    {
        $export = new self($studentLevel);
        $spreadsheet = $export->buildTemplate();
        $writer = new Xlsx($spreadsheet);

        return response()->stream(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="Template-Import-Invoice.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    protected function buildTemplate(): Spreadsheet
    {
        $categories = $this->templateCategories();
        $columns = $this->columns($categories);

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Invoice');

        $this->writeHeader($sheet, $columns);

        $example = [
            1 => '01/JACOS/INV/X/2026',
            2 => '01/10/2026',
            3 => '31/10/2026',
            4 => 'Budi Santoso',
            5 => 'Primary',
        ];

        if (isset($categories[0])) {
            $first = $columns['category'][$categories[0]];
            $example[$first['amount']] = 5000000;
            $example[$first['percent']] = 10;
        }
        if (isset($categories[1])) {
            $second = $columns['category'][$categories[1]];
            $example[$second['amount']] = 1500000;
            $example[$second['fixed']] = 150000;
            $example[$second['paid']] = 500000;
        }

        $this->setValues($sheet, 2, $example);
        $sheet->getStyle([1, 2, $columns['last'], 2])
            ->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('fff3cd');

        foreach ($columns['money'] as $col) {
            $sheet->getStyle([$col, 2])->getNumberFormat()->setFormatCode('#,##0');
        }
        foreach ($columns['percent'] as $col) {
            $sheet->getStyle([$col, 2])->getNumberFormat()->setFormatCode('#,##0.##');
        }

        $sheet->getStyle([1, 1, $columns['last'], 2])
            ->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        $lastColumnLetter = Coordinate::stringFromColumnIndex($columns['last']);
        $sheet->setAutoFilter("A1:{$lastColumnLetter}1");
        $sheet->freezePane('F2');

        $this->buildGuideSheet($spreadsheet, $categories);

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    protected function buildGuideSheet(Spreadsheet $spreadsheet, array $categories): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Petunjuk');
        $sheet->getColumnDimension('A')->setWidth(110);

        $lines = [
            'PETUNJUK IMPORT INVOICE',
            '',
            '1. Satu baris mewakili satu invoice. Jangan menggabungkan beberapa invoice dalam satu baris.',
            '2. Format tanggal wajib DD/MM/YYYY, contoh 01/10/2026.',
            '3. Level yang valid: '.implode(', ', self::VALID_LEVELS).'.',
            '4. Setiap kategori pembayaran memiliki 4 kolom: Harga Awal, Diskon (%), Diskon (Rp), dan Dibayar.',
            '5. Isi Harga Awal untuk kategori yang ditagihkan. Kosongkan kategori yang tidak dipakai.',
            '6. Diskon: isi salah satu. Jika Diskon (%) diisi, nilai Diskon (Rp) akan diabaikan saat import.',
            '7. Dibayar: total pembayaran untuk kategori tersebut, dicatat pada tanggal invoice.',
            '8. Kolom Subtotal Harga Awal, Total Diskon, Total Tagihan, Total Dibayar, Sisa Tagihan, dan Status dihitung otomatis dan diabaikan saat import.',
            '9. Nomor invoice tidak boleh duplikat dengan data yang sudah ada.',
            '10. Jangan mengubah atau menghapus nama kolom.',
            '',
            'Kategori pada template ini: '.(count($categories) > 0 ? implode(', ', $categories) : '(belum ada kategori aktif)'),
        ];

        foreach ($lines as $i => $line) {
            $rowNum = $i + 1;
            $sheet->setCellValue([1, $rowNum], $line);
            $sheet->getStyle([1, $rowNum])->getAlignment()->setWrapText(true);
        }

        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
    }

    /**
     * Definisikan daftar kolom beserta posisinya.
     *
     * @return array{headers: array<int, array{label: string, width: int, kind: string}>, category: array<string, array<string, int>>, summary: array<string, int>, money: array<int, int>, percent: array<int, int>, last: int}
     */
    protected function columns(array $categories): array
    {
        $headers = [
            ['label' => 'No. Invoice', 'width' => 24, 'kind' => 'invoice'],
            ['label' => 'Tanggal', 'width' => 13, 'kind' => 'invoice'],
            ['label' => 'Jatuh Tempo', 'width' => 13, 'kind' => 'invoice'],
            ['label' => 'Nama Siswa', 'width' => 30, 'kind' => 'invoice'],
            ['label' => 'Level', 'width' => 11, 'kind' => 'invoice'],
        ];

        $categoryColumns = [];
        $moneyColumns = [];

        foreach ($categories as $category) {
            foreach (self::CATEGORY_KINDS as $key => $suffix) {
                $categoryColumns[$category][$key] = count($headers) + 1;
                $headers[] = [
                    'label' => "{$category} - {$suffix}",
                    'width' => $key === 'percent' ? 11 : 16,
                    'kind' => 'category',
                ];

                if ($key !== 'percent') {
                    $moneyColumns[] = $categoryColumns[$category][$key];
                }
            }
        }

        $summaryColumns = [];
        foreach (self::SUMMARY_COLUMNS as $label) {
            $summaryColumns[$label] = count($headers) + 1;
            $headers[] = [
                'label' => $label,
                'width' => $label === 'Catatan' ? 35 : 18,
                'kind' => $label === 'Catatan' ? 'notes' : 'summary',
            ];

            if (in_array($label, ['Subtotal Harga Awal', 'Total Diskon', 'Total Tagihan', 'Total Dibayar', 'Sisa Tagihan'], true)) {
                $moneyColumns[] = $summaryColumns[$label];
            }
        }

        $percentColumns = array_values(array_map(
            fn (array $cols) => $cols['percent'],
            $categoryColumns
        ));

        return [
            'headers' => $headers,
            'category' => $categoryColumns,
            'summary' => $summaryColumns,
            'money' => $moneyColumns,
            'percent' => $percentColumns,
            'last' => count($headers),
        ];
    }

    protected function writeHeader($sheet, array $columns): void
    {
        $styles = [
            'invoice' => ['rgb' => '1e3a5f'],
            'category' => ['rgb' => '2563eb'],
            'summary' => ['rgb' => '0f766e'],
            'notes' => ['rgb' => '1e3a5f'],
        ];

        foreach ($columns['headers'] as $index => $header) {
            $col = $index + 1;

            $sheet->setCellValue([$col, 1], $header['label']);
            $sheet->getColumnDimensionByColumn($col)->setWidth($header['width']);
            $sheet->getStyle([$col, 1])->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => $styles[$header['kind']],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true,
                ],
            ]);
        }

        $sheet->getRowDimension(1)->setRowHeight(30);
    }

    protected function setValues($sheet, int $row, array $values): void
    {
        foreach ($values as $col => $value) {
            $sheet->setCellValue([$col, $row], $value);
        }
    }

    /**
     * Agregasi item per kategori (deskripsi item) untuk satu invoice.
     */
    protected function aggregateItems(Invoice $invoice): array
    {
        $aggregated = [];

        foreach ($invoice->items as $item) {
            $name = $item->description;
            $discount = (float) $item->discount_amount;
            $paid = (float) $item->payments->sum('amount');

            if (! isset($aggregated[$name])) {
                $aggregated[$name] = [
                    'amount' => 0.0,
                    'discount' => 0.0,
                    'paid' => 0.0,
                    'type' => $item->discount_type,
                    'value' => (float) ($item->discount_value ?? 0),
                    'count' => 0,
                ];
            }

            $aggregated[$name]['amount'] += (float) $item->amount;
            $aggregated[$name]['discount'] += $discount;
            $aggregated[$name]['paid'] += $paid;
            $aggregated[$name]['count']++;

            // Jika ada beberapa item dengan nama sama, pakai nominal gabungan agar tetap akurat.
            if ($aggregated[$name]['count'] > 1) {
                $aggregated[$name]['type'] = 'fixed';
                $aggregated[$name]['value'] = $aggregated[$name]['discount'];
            }
        }

        return $aggregated;
    }

    /**
     * Kategori untuk export: nama kategori aktif + deskripsi item yang tidak terdaftar.
     */
    protected function exportCategories($invoices): array
    {
        $query = PaymentCategory::query()->where('is_active', true);
        $levels = $this->levels();

        if ($levels !== []) {
            $query->whereIn('student_level', $levels);
        }

        $names = $query->orderBy('name')->pluck('name')->unique()->values()->all();

        $used = [];
        foreach ($invoices as $invoice) {
            foreach ($invoice->items as $item) {
                $description = trim((string) $item->description);
                if ($description !== '' && ! in_array($description, $used, true)) {
                    $used[] = $description;
                }
            }
        }

        $extras = array_values(array_diff($used, $names));
        sort($extras);

        return array_merge($names, $extras);
    }

    /**
     * Kategori untuk template: hanya kategori aktif (opsional difilter level).
     */
    protected function templateCategories(): array
    {
        $query = PaymentCategory::query()->where('is_active', true);
        $levels = $this->levels();

        if ($levels !== []) {
            $query->whereIn('student_level', $levels);
        }

        return $query->orderBy('name')->pluck('name')->unique()->values()->all();
    }

    /**
     * @return array<int, string>
     */
    protected function levels(): array
    {
        if (! $this->studentLevel) {
            return [];
        }

        return array_values(array_filter(array_map(
            'trim',
            explode(',', $this->studentLevel)
        )));
    }
}
