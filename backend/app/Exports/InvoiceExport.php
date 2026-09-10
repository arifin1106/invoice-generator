<?php

namespace App\Exports;

use App\Models\Invoice;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\Response;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class InvoiceExport
{
    protected ?string $studentLevel;

    public function __construct(?string $studentLevel = null)
    {
        $this->studentLevel = $studentLevel;
    }

    public function download(): Response
    {
        $spreadsheet = $this->build();
        $writer = new Xlsx($spreadsheet);
        $filename = 'Invoice-Export-' . now()->format('Y-m-d') . '.xlsx';

        return response()->stream(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    protected function build(): Spreadsheet
    {
        $query = Invoice::with('items')->orderBy('id', 'asc');
        if ($this->studentLevel) {
            $levels = explode(',', $this->studentLevel);
            $query->where(function ($q) use ($levels) {
                foreach ($levels as $level) {
                    $q->orWhereRaw('LOWER(student_level) LIKE ?', ['%' . strtolower(trim($level)) . '%']);
                }
            });
        }
        $invoices = $query->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Invoice');

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1e3a5f']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ];

        $headers = ['A' => 'No. Invoice', 'B' => 'Tanggal', 'C' => 'Jatuh Tempo', 'D' => 'Nama Siswa', 'E' => 'Level', 'F' => 'Total Tagihan', 'G' => 'Terbayar', 'H' => 'Sisa', 'I' => 'Status', 'J' => 'Catatan'];

        foreach ($headers as $col => $label) {
            $sheet->setCellValue("{$col}1", $label);
            $sheet->getStyle("{$col}1")->applyFromArray($headerStyle);
        }

        $widths = ['A' => 22, 'B' => 14, 'C' => 14, 'D' => 30, 'E' => 14, 'F' => 18, 'G' => 18, 'H' => 18, 'I' => 14, 'J' => 35];
        foreach ($widths as $col => $w) $sheet->getColumnDimension($col)->setWidth($w);

        $statusMap = ['paid' => 'Lunas', 'partial' => 'Sebagian', 'unpaid' => 'Belum Lunas'];
        $row = 2;
        foreach ($invoices as $inv) {
            $sheet->setCellValue("A{$row}", $inv->invoice_number);
            $sheet->setCellValue("B{$row}", $inv->date ? \Carbon\Carbon::parse($inv->date)->format('d/m/Y') : '');
            $sheet->setCellValue("C{$row}", $inv->due_date ? \Carbon\Carbon::parse($inv->due_date)->format('d/m/Y') : '');
            $sheet->setCellValue("D{$row}", $inv->student_name);
            $sheet->setCellValue("E{$row}", $inv->student_level);
            $sheet->setCellValue("F{$row}", (float) $inv->total_amount);
            $sheet->setCellValue("G{$row}", (float) $inv->amount_received);
            $sheet->setCellValue("H{$row}", (float) $inv->remaining_balance);
            $sheet->setCellValue("I{$row}", $statusMap[$inv->status] ?? $inv->status);
            $sheet->setCellValue("J{$row}", $inv->notes);
            foreach (['F', 'G', 'H'] as $c) $sheet->getStyle("{$c}{$row}")->getNumberFormat()->setFormatCode('#,##0');
            if ($row % 2 === 0) $sheet->getStyle("A{$row}:J{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('f0f4f8');
            $row++;
        }

        if ($row > 2) {
            $sheet->getStyle("A1:J" . ($row - 1))->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        }
        return $spreadsheet;
    }

    public static function template(): Response
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Invoice');
        $headerStyle = ['font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1e3a5f']], 'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]];
        $headers = ['A' => 'No. Invoice*', 'B' => 'Tanggal* (DD/MM/YYYY)', 'C' => 'Jatuh Tempo* (DD/MM/YYYY)', 'D' => 'Nama Siswa*', 'E' => 'Level* (P1/P2/K1/K2/Primary)', 'F' => 'Total Tagihan*', 'G' => 'Terbayar', 'H' => 'Status (paid/partial/unpaid)', 'I' => 'Catatan'];
        foreach ($headers as $col => $label) { $sheet->setCellValue("{$col}1", $label); $sheet->getStyle("{$col}1")->applyFromArray($headerStyle); $sheet->getColumnDimension($col)->setAutoSize(true); }
        $sheet->setCellValue('A2', 'INV/2024/001'); $sheet->setCellValue('B2', '01/01/2024'); $sheet->setCellValue('C2', '31/01/2024'); $sheet->setCellValue('D2', 'Budi Santoso'); $sheet->setCellValue('E2', 'Primary'); $sheet->setCellValue('F2', 5000000); $sheet->setCellValue('G2', 0); $sheet->setCellValue('H2', 'unpaid'); $sheet->setCellValue('I2', 'Contoh catatan');
        $sheet->getStyle('A2:I2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('fff3cd');

        $writer = new Xlsx($spreadsheet);

        return response()->stream(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="Template-Import-Invoice.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
