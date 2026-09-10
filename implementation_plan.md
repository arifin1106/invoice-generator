# Update v7 — Export & Import Invoice / Kwitansi

## Deskripsi
Menambahkan fitur **Export** (ke Excel/CSV) dan **Import** (dari Excel/CSV) data pada halaman daftar invoice per-kategori dan halaman kwitansi. Fitur ini tidak ada di Dashboard utama.

> [!IMPORTANT]
> **Tidak akan langsung push ke GitHub.** Setelah implementasi selesai, Anda akan diminta untuk mengecek terlebih dahulu melalui localhost sebelum di-deploy.

---

## Letak Tombol Export & Import

| Halaman | Route | Tombol |
|---|---|---|
| Invoice Preschool & Kindergarten | `/invoices/preschool` | ✅ Export + Import |
| Invoice Primary | `/invoices/primary` | ✅ Export + Import |
| Kwitansi | `/receipts` | ✅ Export + Import |
| Dashboard | `/dashboard` | ❌ Tidak ada |

---

## Rencana Perubahan

### Backend (Laravel)

#### 1. Install Library
- Install package `maatwebsite/excel` (Laravel Excel) via Composer.

#### 2. [NEW] `app/Exports/InvoiceExport.php`
- Kelas Export untuk invoice.
- **Kolom:** `No. Invoice`, `Tanggal`, `Jatuh Tempo`, `Nama Siswa`, `Level`, `Total Tagihan`, `Terbayar`, `Sisa`, `Status`, `Catatan`
- Menerima parameter `category` (`preschool` atau `primary`) untuk filter data sesuai kategori yang sedang dibuka.

#### 3. [NEW] `app/Exports/ReceiptExport.php`
- Kelas Export untuk kwitansi.
- **Kolom:** `No. Kwitansi`, `Tanggal`, `Diterima Dari`, `Jumlah (Rp)`, `Terbilang`, `Kategori Pembayaran`, `Keterangan`

#### 4. [NEW] `app/Imports/InvoiceImport.php`
- Kelas Import untuk membaca file Excel dan memasukkan data invoice ke database.
- Validasi otomatis setiap baris (format tanggal, kolom wajib, dll).

#### 5. [NEW] `app/Imports/ReceiptImport.php`
- Kelas Import untuk kwitansi.

#### 6. [MODIFY] `InvoiceController.php`
- Tambah `export(Request $request)` → filter by `category` (preschool/primary), lalu download Excel.
- Tambah `import(Request $request)` → upload & proses file Excel.
- Tambah `template()` → download file template kosong untuk panduan import.

#### 7. [MODIFY] `ReceiptController.php`
- Tambah `export()`, `import()`, dan `template()`.

#### 8. [MODIFY] `routes/api.php`
- Tambah 6 route baru di dalam grup `auth:sanctum`:
  ```
  GET  /invoices/export    → export Excel (filter by ?category=preschool)
  POST /invoices/import    → upload & import Excel
  GET  /invoices/template  → download template kosong
  GET  /receipts/export    → export Excel kwitansi
  POST /receipts/import    → upload & import Excel kwitansi
  GET  /receipts/template  → download template kosong
  ```

---

### Frontend (React)

#### 9. [MODIFY] `frontend/src/pages/InvoiceList.jsx`
- Di pojok kanan atas halaman (sejajar dengan tombol "Buat Invoice"), tambahkan grup tombol:
  - **📥 Download Template** — mengunduh file `.xlsx` template kosong.
  - **⬆️ Import** — memunculkan dialog pemilihan file `.xlsx` / `.csv`.
  - **⬇️ Export Excel** — mengunduh semua data invoice pada kategori ini.

#### 10. [MODIFY] `frontend/src/pages/ReceiptList.jsx`
- Di pojok kanan atas halaman (sejajar dengan tombol "Buat Kwitansi"), tambahkan grup tombol yang sama:
  - **📥 Download Template**
  - **⬆️ Import**
  - **⬇️ Export Excel**

#### 11. [MODIFY] `frontend/src/services/api.js`
- Tambah fungsi `exportInvoices(category)`, `importInvoices(file)`, `exportReceipts()`, `importReceipts(file)`.

---

## Verification Plan
1. ✅ Uji Export: klik tombol "Export Excel" di halaman Preschool → pastikan file terunduh & data benar.
2. ✅ Uji Import: isi template → upload → pastikan data baru muncul di tabel.
3. ✅ Uji Template: klik "Download Template" → buka file → pastikan header kolom sudah benar.
4. ⏸️ **Lapor ke Anda** untuk pengecekan via localhost — push ke GitHub dilakukan setelah Anda menyetujui.
