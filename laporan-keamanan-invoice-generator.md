# Laporan Keamanan — Invoice Generator (JACOS)

## Ringkasan

Secara umum arsitektur aplikasi sudah cukup baik: validasi input rapi di semua controller, tidak ditemukan SQL injection, tidak ada secret/credential yang ter-commit ke repo, dan fitur share PDF publik sudah memakai _signed URL_ (bukan ID yang mudah ditebak). Namun ada beberapa celah yang perlu diperbaiki, terutama seputar manajemen sesi/token dan proteksi endpoint login.

---

## 🔴 Prioritas Tinggi

### 1. Token API tidak pernah expired

**Lokasi:** `backend/config/sanctum.php` → `'expiration' => null`
**Detail:** Token disimpan di `localStorage` frontend (`frontend/src/services/api.js`, `frontend/src/context/AuthContext.jsx`) dan hanya di-revoke saat user login ulang (`AuthController.php` baris 29, `$user->tokens()->delete()`). Jika token bocor — lewat XSS, malware di device staf, atau laptop hilang — token tersebut valid **selamanya** sampai user itu login ulang.

**Perbaikan:**

```php
// backend/config/sanctum.php
'expiration' => 1440, // 24 jam, dalam menit
```

Tambahan: sediakan tombol "Logout dari semua perangkat" di halaman profil yang memanggil `$user->tokens()->delete()`.

---

### 2. Tidak ada rate limiting di endpoint login

**Lokasi:** `backend/routes/api.php` baris 13
**Detail:** `Route::post('/login', ...)` tidak dibatasi, sehingga rentan brute-force password tanpa batas percobaan.

**Perbaikan:**

```php
// backend/routes/api.php
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1'); // maks 5 percobaan per menit per IP
```

Pertimbangkan juga menambahkan lockout sementara (misal via `RateLimiter::hit()` custom) setelah beberapa kali gagal berturut-turut untuk akun yang sama, tidak hanya per-IP.

---

### 3. Pesan error PDF membocorkan detail internal server

**Lokasi:** `backend/app/Http/Controllers/Api/InvoiceController.php` baris 269–275
**Detail:** Saat gagal generate PDF, response API mengembalikan path file server (`$e->getFile()`) dan nomor baris kode (`$e->getLine()`) langsung ke client — informasi ini seharusnya hanya untuk debugging internal.

**Perbaikan:**

```php
} catch (\Throwable $e) {
    \Illuminate\Support\Facades\Log::error('Gagal generate PDF invoice', [
        'invoice_id' => $invoice->id,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);

    return response()->json([
        'message' => 'Gagal membuat PDF invoice. Silakan coba lagi atau hubungi admin.',
    ], 500);
}
```

---

## 🟡 Prioritas Sedang

### 4. CORS terbuka untuk semua origin

**Lokasi:** `backend/config/cors.php` → `'allowed_origins' => ['*']`
**Detail:** Risiko saat ini relatif rendah karena `supports_credentials` diset `false` (cookie tidak otomatis ikut terkirim cross-origin), tapi tetap sebaiknya dibatasi ke domain frontend resmi saja sebagai _defense in depth_.

**Perbaikan:**

```php
// backend/config/cors.php
'allowed_origins' => [
    'https://invoice-generator-nu-mauve.vercel.app',
],
```

---

### 5. Minimum panjang password terlalu pendek

**Lokasi:** `backend/app/Http/Controllers/Api/ProfileController.php` baris 36
**Detail:** `Password::min(6)` — terlalu longgar untuk akun admin/staf keuangan.

**Perbaikan:**

```php
'new_password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
```

---

### 6. Tidak ada pemisahan peran (role) antar user

**Lokasi:** `backend/app/Models/User.php` (tidak ada kolom `role`)
**Detail:** Semua user yang berhasil login punya akses penuh ke semua invoice, kwitansi, dan pengaturan rekening bank. Ini bukan bug (memang didesain single-tenant untuk staf internal), tapi jadi risiko kalau jumlah staf bertambah dan tidak semua perlu akses penuh (misal staf yang hanya boleh melihat, bukan menghapus data).

**Rekomendasi (opsional, untuk pengembangan berikutnya):**

- Tambah kolom `role` di tabel `users` (misal `admin`, `staff`).
- Buat middleware/policy untuk membatasi aksi sensitif (hapus invoice, ubah rekening bank) hanya untuk role `admin`.

---

## 🟢 Sudah Baik (tidak perlu diubah)

- Tidak ada file `.env` atau credential yang ter-commit ke repo.
- Password di-hash dengan `Hash::check`/bcrypt, field `password` & `remember_token` disembunyikan dari response API (`User.php`).
- Semua query database memakai parameter binding — tidak ditemukan celah SQL injection.
- Upload foto profil & logo divalidasi tipe file (`mimes:jpg,jpeg,png,gif,webp`) dan ukuran maksimum.
- Fitur share PDF publik (untuk dikirim via WhatsApp) memakai _signed URL_ Laravel dengan masa berlaku 7 hari — bukan ID/link yang bisa ditebak.

---

## Catatan Deployment

- Pastikan environment variable `APP_DEBUG=false` di server produksi (nilai di `.env.example` adalah `true`, itu hanya untuk local development).
- Jalankan `composer audit` dan `npm audit` secara berkala untuk memantau dependency yang punya CVE baru.

---

## Ringkasan Prioritas

| #   | Temuan                         | Prioritas | File                    |
| --- | ------------------------------ | --------- | ----------------------- |
| 1   | Token tidak expired            | 🔴 Tinggi | `config/sanctum.php`    |
| 2   | Tidak ada rate limit login     | 🔴 Tinggi | `routes/api.php`        |
| 3   | Error PDF bocorkan path server | 🔴 Tinggi | `InvoiceController.php` |
| 4   | CORS `allowed_origins: *`      | 🟡 Sedang | `config/cors.php`       |
| 5   | Password minimal 6 karakter    | 🟡 Sedang | `ProfileController.php` |
| 6   | Tidak ada role/permission      | 🟡 Sedang | `Models/User.php`       |
