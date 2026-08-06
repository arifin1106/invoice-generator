<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Kwitansi {{ $receipt->receipt_number }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 10pt;
    color: #111;
    background: #fff;
}
/* Page container – half A4 landscape or fit to width */
.wrap {
    width: 250mm;
    margin: 0 auto;
    padding: 10mm;
    border: 2px solid #000;
    position: relative;
    border-radius: 8px;
    margin-top: 5mm;
}

/* ─── Header ─── */
.header-table {
    width: 100%;
    margin-bottom: 20px;
}
.header-table td { vertical-align: middle; }
.logo-img { height: 70px; width: auto; max-width: 200px; }
.title-text { font-size: 20pt; font-weight: 700; text-align: center; letter-spacing: 3px; text-decoration: underline; }
.no-kwitansi { font-size: 11pt; font-weight: bold; text-align: center; margin-top: 5px; }

/* ─── Body Kwitansi ─── */
.kw-body {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
}
.kw-body td {
    padding: 8px 5px;
    vertical-align: top;
    font-size: 11pt;
}
.kw-label {
    width: 180px;
    font-weight: 600;
}
.kw-colon {
    width: 20px;
    text-align: center;
}
.kw-value {
    border-bottom: 1px dotted #000;
    font-style: italic;
}
.kw-terbilang-box {
    background: #f2f2f2;
    padding: 10px;
    border: 1px solid #000;
    font-weight: bold;
    font-style: italic;
    font-size: 12pt;
    border-radius: 4px;
}

/* ─── Footer ─── */
.footer-table {
    width: 100%;
}
.footer-table td {
    vertical-align: bottom;
}
.amount-box {
    border: 2px solid #000;
    padding: 10px 20px;
    font-size: 16pt;
    font-weight: bold;
    display: inline-block;
    border-radius: 4px;
    background: #fdfdfd;
}

/* ─── Signature ─── */
.sig-wrap { text-align: center; width: 250px; float: right; }
.sig-date { margin-bottom: 60px; font-size: 11pt; }
.sig-line { border-bottom: 1px solid #000; width: 100%; display: inline-block; }
.sig-name { font-weight: bold; font-size: 11pt; margin-top: 5px; }

</style>
</head>
<body>

@php
    $setting = \App\Models\Setting::first();

    $toBase64 = function($absPath) {
        if (!$absPath || !file_exists($absPath)) return '';
        $ext  = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
        $mime = match($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'gif'         => 'image/gif',
            'webp'        => 'image/webp',
            default       => 'image/png',
        };
        $data = @file_get_contents($absPath);
        return $data ? 'data:' . $mime . ';base64,' . base64_encode($data) : '';
    };

    $logoSrc = '';
    if ($setting && $setting->institution_logo) {
        $logoSrc = $toBase64(storage_path('app/public/' . $setting->institution_logo));
    }
    if (!$logoSrc) {
        $logoSrc = $toBase64(public_path('asset/logo-JACOS.png'));
    }
    
    $city = $setting && $setting->institution_address ? explode(',', $setting->institution_address)[0] : 'Jakarta';
@endphp

<div class="wrap">
    
    <table class="header-table">
        <tr>
            <td style="width: 25%;">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" class="logo-img" alt="Logo">
                @else
                    <div style="font-weight:bold; font-size:16pt;">JACOS</div>
                @endif
            </td>
            <td style="width: 50%;">
                <div class="title-text">KWITANSI</div>
                <div class="no-kwitansi">No. {{ $receipt->receipt_number }}</div>
            </td>
            <td style="width: 25%;"></td>
        </tr>
    </table>

    <table class="kw-body">
        <tr>
            <td class="kw-label">Telah terima dari</td>
            <td class="kw-colon">:</td>
            <td class="kw-value">{{ $receipt->received_from }}</td>
        </tr>
        <tr>
            <td class="kw-label">Uang sejumlah</td>
            <td class="kw-colon">:</td>
            <td>
                <div class="kw-terbilang-box">
                    # {{ $receipt->amount_in_words }} #
                </div>
            </td>
        </tr>
        <tr>
            <td class="kw-label">Untuk pembayaran</td>
            <td class="kw-colon">:</td>
            <td class="kw-value">
                @if($receipt->payment_category)
                    <strong>[{{ $receipt->payment_category }}]</strong>
                @endif
                {{ $receipt->description }}
            </td>
        </tr>
    </table>

    <table class="footer-table">
        <tr>
            <td style="width: 50%;">
                <div class="amount-box">
                    Rp {{ number_format($receipt->amount, 0, ',', '.') }}
                </div>
            </td>
            <td style="width: 50%;">
                <div class="sig-wrap">
                    <div class="sig-date">{{ $city }}, {{ \Carbon\Carbon::parse($receipt->date)->translatedFormat('d F Y') }}</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Penerima</div>
                </div>
            </td>
        </tr>
    </table>
    
    <div style="clear:both;"></div>

</div>

</body>
</html>
