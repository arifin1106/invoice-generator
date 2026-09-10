<?php
namespace App\Exports;
use App\Models\Receipt;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\Response;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class ReceiptExport
{
    public function download(): Response
    {
        $spreadsheet = $this->build();
        $writer = new Xlsx($spreadsheet);
        $filename = 'Kwitansi-Export-' . now()->format('Y-m-d') . '.xlsx';

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
        $receipts = Receipt::orderBy('date', 'desc')->orderBy('id', 'desc')->get();
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Kwitansi');
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1e3a5f']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ];
        $headers = ['A' => 'No. Kwitansi', 'B' => 'Tanggal', 'C' => 'Diterima Dari', 'D' => 'Jumlah (Rp)', 'E' => 'Terbilang', 'F' => 'Kategori Pembayaran', 'G' => 'Keterangan'];
        foreach ($headers as $col => $label) {
            $sheet->setCellValue("{$col}1", $label);
            $sheet->getStyle("{$col}1")->applyFromArray($headerStyle);
        }
        $widths = ['A' => 22, 'B' => 14, 'C' => 30, 'D' => 18, 'E' => 35, 'F' => 25, 'G' => 35];
        foreach ($widths as $col => $w) $sheet->getColumnDimension($col)->setWidth($w);
        $row = 2;
        foreach ($receipts as $rec) {
            $sheet->setCellValue("A{$row}", $rec->receipt_number);
            $sheet->setCellValue("B{$row}", $rec->date ? \Carbon\Carbon::parse($rec->date)->format('d/m/Y') : '');
            $sheet->setCellValue("C{$row}", $rec->received_from);
            $sheet->setCellValue("D{$row}", (float) $rec->amount);
            $sheet->setCellValue("E{$row}", $rec->amount_in_words);
            $sheet->setCellValue("F{$row}", $rec->payment_category);
            $sheet->setCellValue("G{$row}", $rec->description);
            $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode('#,##0');
            if ($row % 2 === 0) $sheet->getStyle("A{$row}:G{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('f0f4f8');
            $row++;
        }
        if ($row > 2) $sheet->getStyle("A1:G" . ($row - 1))->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        return $spreadsheet;
    }

    public static function template(): Response
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Kwitansi');
        $headerStyle = ['font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1e3a5f']], 'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]];
        $headers = ['A' => 'No. Kwitansi*', 'B' => 'Tanggal* (DD/MM/YYYY)', 'C' => 'Diterima Dari*', 'D' => 'Jumlah*', 'E' => 'Terbilang', 'F' => 'Kategori (Seragam Sekolah/Cathering Makanan/Jemputan Sekolah)', 'G' => 'Keterangan'];
        foreach ($headers as $col => $label) { $sheet->setCellValue("{$col}1", $label); $sheet->getStyle("{$col}1")->applyFromArray($headerStyle); $sheet->getColumnDimension($col)->setAutoSize(true); }
        $sheet->setCellValue('A2', 'KWT/2024/001'); $sheet->setCellValue('B2', '01/01/2024'); $sheet->setCellValue('C2', 'Budi Santoso'); $sheet->setCellValue('D2', 500000); $sheet->setCellValue('E2', 'Lima Ratus Ribu Rupiah'); $sheet->setCellValue('F2', 'Seragam Sekolah'); $sheet->setCellValue('G2', 'Contoh keterangan');
        $sheet->getStyle('A2:G2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('fff3cd');

        $writer = new Xlsx($spreadsheet);

        return response()->stream(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="Template-Import-Kwitansi.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}