### backend

~ 1. untuk data invoice keseluruhan tampil pada menu dahsboard utama
~ 2. pemisahan data invoice untuk kategori preschool-kindergarten & Primary, akan ada 2 submenu nantinya
~ 3. pada penomoran dibuat menjadi mengikuti invoice yang sudah dibuat sebelumnya, jadi tidak reset lagi.

### update menu dalam invoice

- Dashboard (tampilan keseluruhan data invoice)
  - Detail total invoice per bulan
  - Grafik
- Inovice
  - Preschool & Kindergarten
  - Primary
- Kwitansi
- Setting

### update v4

1. ttd sifatnya tidak menetap, karna sejauh ini tanda tangan masih terkoneksi dengan file ttd yang ada di dalam project ini, jadi ttd ini dibuat seperti upload ttd biasa saja.
2. untuk keterangan pada invoice, ketika angka sudah terbayar penuh maka otomatis keterangan akan lunas, baik ketika membuat invoice, edit invoice, dan hal tersebut berlaku untuk semua keterangan.
3. ketika download invoice loadingnya terlalu lama, mungkin kita coba untuk debugging sekaligus update.

### update v5

1. status pada invoice di semua tampilan (preview & pdf) dibuat sama ketika edit/buat.
2. upload ttd lewat pengaturan harus masuk ke invoice (pdf) dan terlihat juga pada preview invoice.

### update v6 — Keamanan

1. Token API expire otomatis setelah 24 jam (`config/sanctum.php` → `SANCTUM_TOKEN_TTL_MINUTES=1440`).
2. Rate limiting login: maks 5 percobaan/menit per IP + lockout per-email 15 menit setelah 5 kegagalan berturut-turut.
3. Error PDF tidak lagi membocorkan path/line server ke client — hanya di-log secara internal (`Log::error`). Berlaku untuk invoice dan kwitansi.
4. CORS dibatasi sesuai domain (`CORS_ALLOWED_ORIGINS` env). Frontend Vercel + localhost dev saja.
5. Password profil minimum 8 karakter dengan huruf besar, huruf kecil, dan angka.
6. Token expired/401 di frontend otomatis bersih & redirect ke halaman login (tidak lagi "gantung").
7. Tombol "Logout Semua Perangkat" tersedia di profil — menghapus semua token aktif sekaligus.

### update v7 - Export semua data invoice dan kwitansi ke excel/CSV

1. Penambahan fitur export pada semua invoice dan kwitansi agar bisa backup data invoice yang sudah di buat dalam sistem.
2. penambahan fitur import juga pada invoice dan kwitansi untuk mempermudah saat migrasi data.
