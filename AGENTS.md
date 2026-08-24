# AGENTS.md

Generator invoice & kwitansi sekolah untuk Jakarta Cosmopolite Islamic School (JCoS). Dua aplikasi independen dalam satu repo, tanpa tooling bersama:

- `frontend/` — SPA React 19 + Vite, JSX biasa (tanpa TS). Semua styling ada di `src/index.css` (`src/App.css` adalah boilerplate Vite yang tidak terpakai). Linter adalah **oxlint** (`npm run lint`), bukan eslint.
- `backend/` — API REST Laravel 13 + Sanctum (token auth), `barryvdh/laravel-dompdf` untuk PDF. Database adalah **PostgreSQL di Supabase** via `DB_URL` (pooler port 6543, `DB_SSLMODE=require`) — hindari SQL khusus MySQL (mis. `FIELD()`); `.env.example` berisi template Supabase yang sama.

## Menjalankan secara lokal (dua server)
- Backend (port 8000): `cd backend && composer install && php artisan serve` (+ `php artisan migrate`, `php artisan storage:link`).
- Frontend (port 5173): `cd frontend && npm install && npm run dev` — Vite melakukan proxy `/api` → `http://localhost:8000`.
- Login dev bawaan seeder: `admin@jacos.id` / `password123`.

## Perintah
- Backend: `php artisan test` (hanya ada test contoh bawaan), `vendor/bin/pint` untuk formatting; `composer setup` / `composer dev` tersedia untuk setup lengkap / dev bersamaan.
- Frontend: `npm run dev`, `npm run build`, `npm run lint` (oxlint), `npm run preview`.

## API & auth
- Semua route kecuali `POST /api/login` berada di balik `auth:sanctum`. Hanya token auth (tanpa cookies/CSRF): kirim `Authorization: Bearer <token>`; frontend menyimpan token di `localStorage.auth_token`.
- Error validasi dikembalikan sebagai `{ message, errors }` (format Laravel).

## Aturan domain (jangan dibuat ulang)
- Status item invoice adalah `Lunas` / `Belum Lunas` (Bahasa Indonesia, dengan spasi). `status` level invoice (`paid`/`partial`/`unpaid`) dan `remaining_balance` dihitung otomatis di hook `saving` model `Invoice` — jangan pernah dikirim.
- Nomor invoice/kwitansi dibuat di server-side (`GET /invoices/generate-number`, `/receipts/generate-number`) dalam bentuk `01/JACOS/INV/VII/2026`. Kwitansi meng-hitung `amount_in_words` otomatis di server-side (`terbilang()`).
- PDF dirender server-side oleh DomPDF dari `resources/views/invoice-pdf.blade.php` dan `resources/views/receipts/pdf.blade.php`; diunduh sebagai blob via `GET /invoices/{id}/pdf`. `html2canvas`/`jspdf` di `frontend/package.json` tidak terpakai — jangan dipakai sebagai jalur PDF.
- Pengaturan (settings) berupa satu baris di DB; `SettingController` menambahkan `logo_url`/`signature_url` untuk gambar yang diunggah (`storage/app/public/logos|signatures`). File logo/tanda tangan diunggah melalui endpoint settings yang sama sebagai multipart FormData.
- Styling cetak menggunakan kelas CSS `no-print` pada halaman preview.

## Konvensi
- Semua teks UI dan pesan API dalam Bahasa Indonesia; mata uang Rupiah (`src/utils/format.js`: `formatRupiah`, `parseRupiah`, `formatDate`). Jaga string baru tetap Bahasa Indonesia.
- Route frontend berada di dalam `Layout` + `ProtectedRoute` di `src/App.jsx`; deploy Vercel bergantung pada SPA rewrite di `vercel.json`.
- Backend mengembalikan tanggal `YYYY-MM-DD`; selalu gunakan helper `formatDate`/`toInputDate` untuk menghindari bug pergeseran zona waktu UTC.
