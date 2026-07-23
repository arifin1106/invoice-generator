<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Invoice {{ $invoice->invoice_number }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 9pt;
    color: #111;
    background: #fff;
}
/* Page container â€“ match A4 inner width exactly */
.wrap {
    width: 174mm;
    margin: 0 auto;
    padding: 10mm 0 12mm;
}

/* ─── Institution name ─── */
.inst-name  { font-size: 12pt; font-weight: 700; color: #000; margin-bottom: 3px; }
.inst-detail{ font-size: 8pt; color: #222; line-height: 1.65; }

/* ─── Logo ─── */
.logo-img { height: 65px; width: auto; max-width: 200px; }

/* ─── Divider with text ─── */
.divider-row td { vertical-align: middle; font-size: 0; }
.div-line  { border-top: 1.5px solid #000; height: 0; }
.div-label { white-space: nowrap; font-size: 10pt; font-weight: 700; letter-spacing: 2px; padding: 0 9px; color: #000; }

/* ─── Info boxes ─── */
.info-box {
    border: 1px solid #888;
    padding: 5px 8px;
    font-size: 8.5pt;
    line-height: 1.6;
}
.box-title { font-weight: 700; font-size: 8.5pt; margin-bottom: 2px; }

/* ─── Items table ─── */
.items { width: 100%; border-collapse: collapse; }
.items th {
    border: 1px solid #888;
    padding: 5px 6px;
    font-size: 8.5pt;
    font-weight: 700;
    background: #f2f2f2;
    text-align: left;
}
.items td {
    border: 1px solid #888;
    padding: 5px 6px;
    font-size: 8.5pt;
}
.items .cn { width: 6%;  text-align: center; }
.items .cd { width: 44%; }
.items .ca { width: 27%; text-align: right; }
.items .cs { width: 23%; }

/* ─── Summary ─── */
.sum { width: 100%; border-collapse: collapse; border-top: 0; }
.sum td { font-size: 8.5pt; padding: 4px 6px; }
.sum .se { width: 27%; border: 0; }                   /* spacer (No+Desc) */
.sum .sl {
    width: 44%;
    border: 1px solid #888;
    border-top: none;
    text-align: right;
    font-weight: 600;
}
.sum .sa {
    width: 27%;
    border: 1px solid #888;
    border-top: none;
    text-align: right;
    font-weight: 700;
}

/* ─── Notes box ─── */
.notes-box {
    border: 1px solid #888;
    padding: 6px 8px;
    font-size: 8pt;
    line-height: 1.65;
}
.notes-title { font-weight: 700; font-size: 8.5pt; margin-bottom: 3px; }

/* ─── Bank box ─── */
.bank-box {
    border: 1.5px solid #111;
    padding: 6px 9px;
    font-size: 8pt;
    line-height: 1.65;
}
.bank-title { font-weight: 700; font-size: 8.5pt; margin-bottom: 4px; }
.bank-t { width: 100%; border-collapse: collapse; }
.bank-t td { font-size: 8pt; padding: 1px 0; vertical-align: top; }
.bk { width: 100px; }
.bc { width: 10px; }

/* ─── Signature ─── */
.sig-wrap { text-align: center; }
.sig-img  { height: 60px; width: auto; max-width: 150px; }
.sig-line { border-top: 1px solid #111; width: 130px; margin: 5px auto 3px; }
.sig-name { font-size: 9pt; font-weight: 700; }
.sig-ttl  { font-size: 8pt; color: #555; }

/* ─── Spacing helpers ─── */
.sp3 { height: 3mm; }
.sp4 { height: 4mm; }
.sp5 { height: 5mm; }
.sp6 { height: 6mm; }
.sp8 { height: 8mm; }
</style>
</head>
<body>
<div class="wrap">

@php
    /*
     * Encode image to base64 data URI - safe closure (no named function = no redeclaration error).
     * Detects extension to pick mime type, no GD required.
     */
    $toBase64 = function($absPath) {
        if (!$absPath || !file_exists($absPath)) return '';
        $ext  = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
        $mime = match($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'gif'         => 'image/gif',
            'webp'        => 'image/webp',
            default       => 'image/png',
        };
        if (!file_exists($absPath)) return '';
        $data = @file_get_contents($absPath);
        return $data ? 'data:' . $mime . ';base64,' . base64_encode($data) : '';
    };

    /* Logo */
    $logoSrc = '';
    if ($setting && $setting->institution_logo) {
        $logoSrc = $toBase64(storage_path('app/public/' . $setting->institution_logo));
    }
    if (!$logoSrc) {
        $logoSrc = $toBase64(public_path('asset/logo-JACOS.png'));
    }

    /* Signature */
    $sigSrc = '';
    if ($setting && $setting->signer_signature) {
        $sigSrc = $toBase64(storage_path('app/public/' . $setting->signer_signature));
    }
    if (!$sigSrc) {
        $sigSrc = $toBase64(public_path('asset/ttd-ratih.png'));
    }

    $hasNote = !empty(trim($invoice->notes ?? '')) || !empty(trim($setting?->payment_message ?? ''));
@endphp

{{-- â•â•â•â•â•â•â•â•â•â• HEADER â•â•â•â•â•â•â•â•â•â• --}}
<table style="width:100%; border-collapse:collapse;">
  <tr>
    {{-- LEFT: institution info --}}
    <td style="vertical-align:top; width:60%;">
      <div class="inst-name">{{ $setting->institution_name ?? 'Jakarta Cosmopolite Islamic School' }}</div>
      <div class="inst-detail">
        @if(!empty($setting?->institution_address))
          Alamat: {{ $setting->institution_address }}<br>
        @endif
        @if(!empty($setting?->institution_phone))
          <br>Telepon: {{ $setting->institution_phone }}<br>
        @endif
        @if(!empty($setting?->institution_email))
          Email: {{ $setting->institution_email }}
        @endif
      </div>
    </td>

    {{-- RIGHT: logo + invoice meta --}}
    <td style="vertical-align:top; width:40%; text-align:right;">
      <img src="{{ $logoSrc }}" class="logo-img" alt="">
      <br>
      <table style="width:100%; border-collapse:collapse; margin-top:4px;">
        <tr>
          <td style="text-align:right; font-size:9pt; line-height:1.9;">
            Invoice: {{ $invoice->invoice_number }}<br>
            Tanggal: {{ $invoice->date->format('d/m/Y') }}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<div class="sp5"></div>

{{-- â•â•â•â•â•â•â•â•â•â• INVOICE DIVIDER â•â•â•â•â•â•â•â•â•â• --}}
<table style="width:100%; border-collapse:collapse;" class="divider-row">
  <tr>
    <td style="width:44%; height:2px;" class="div-line"></td>
    <td class="div-label" style="text-align:center; font-size:10pt; font-weight:700; letter-spacing:2px; white-space:nowrap; padding:0 9px;">INVOICE</td>
    <td style="width:44%; height:2px;" class="div-line"></td>
  </tr>
</table>

<div class="sp4"></div>

{{-- â•â•â•â•â•â•â•â•â•â• STUDENT + DUE DATE â•â•â•â•â•â•â•â•â•â• --}}
<table style="width:100%; border-collapse:collapse;">
  <tr>
    <td style="width:53%; vertical-align:top;">
      <div class="info-box">
        <div class="box-title">Student</div>
        <div>Nama : {{ $invoice->student_name }}</div>
        <div>Level: {{ $invoice->student_level }}</div>
      </div>
    </td>
    <td style="width:6mm;"></td>
    <td style="width:43%; vertical-align:top;">
      <div class="info-box">
        <div>Jatuh Tempo: <strong>{{ $invoice->due_date->format('d/m/Y') }}</strong></div>
      </div>
    </td>
  </tr>
</table>

<div class="sp4"></div>

{{-- â•â•â•â•â•â•â•â•â•â• ITEMS TABLE â•â•â•â•â•â•â•â•â•â• --}}
<table class="items">
  <thead>
    <tr>
      <th class="cn">No</th>
      <th class="cd">Keterangan</th>
      <th class="ca">Nominal</th>
      <th class="cs">Keterangan</th>
    </tr>
  </thead>
  <tbody>
    @foreach($invoice->items as $i => $item)
    <tr>
      <td class="cn">{{ $i + 1 }}</td>
      <td class="cd">{{ $item->description }}</td>
      <td class="ca">Rp {{ number_format($item->amount, 0, ',', '.') }}</td>
      <td class="cs">{{ $item->status }}</td>
    </tr>
    @endforeach
  </tbody>
</table>

{{-- Summary rows: blank (No col 6% + Desc col 44%) | label | amount --}}
<table class="sum">
  <tr>
    <td class="se"></td>
    <td class="sl" style="border-top: 1.5px solid #555; font-weight:700;">Total</td>
    <td class="sa" style="border-top: 1.5px solid #555;">Rp {{ number_format($invoice->total_amount, 0, ',', '.') }}</td>
  </tr>
  <tr>
    <td class="se"></td>
    <td class="sl">Bayaran Diterima</td>
    <td class="sa">Rp {{ number_format($invoice->amount_received, 0, ',', '.') }}</td>
  </tr>
  <tr>
    <td class="se"></td>
    <td class="sl">Sisa Tagihan</td>
    <td class="sa">Rp {{ number_format($invoice->remaining_balance, 0, ',', '.') }}</td>
  </tr>
</table>

{{-- â•â•â•â•â•â•â•â•â•â• PESAN / NOTES â•â•â•â•â•â•â•â•â•â• --}}
@if($hasNote)
<div class="sp5"></div>
<table style="width:100%; border-collapse:collapse;">
  <tr>
    <td style="width:58%; vertical-align:top;">
      <div class="notes-box">
        <div class="notes-title">Pesan</div>
        <div>Student: {{ $invoice->student_name }}</div>
        @if(!empty(trim($invoice->notes ?? '')))
          <div>{{ $invoice->notes }}</div>
        @endif
        @if(!empty(trim($setting?->payment_message ?? '')))
          <div>{{ $setting->payment_message }}</div>
        @endif
      </div>
    </td>
    <td></td>
  </tr>
</table>
@endif

<div class="sp6"></div>

{{-- â•â•â•â•â•â•â•â•â•â• FOOTER: bank left + logo+sig right â•â•â•â•â•â•â•â•â•â• --}}
<table style="width:100%; border-collapse:collapse;">
  <tr>
    {{-- Bank detail --}}
    <td style="width:54%; vertical-align:bottom;">
      @if($setting && ($setting->bank_name || $setting->bank_account_number))
      <div class="bank-box">
        <div class="bank-title">Detail Pembayaran</div>
        <table class="bank-t">
          @if($setting->bank_name)
          <tr>
            <td class="bk">Nama Bank</td>
            <td class="bc">:</td>
            <td>{{ $setting->bank_name }}</td>
          </tr>
          @endif
          @if($setting->bank_account_number)
          <tr>
            <td class="bk">Nomor Akun Bank</td>
            <td class="bc">:</td>
            <td><strong>{{ $setting->bank_account_number }}</strong></td>
          </tr>
          @endif
          @if($setting->bank_account_name)
          <tr>
            <td class="bk">Atas Nama</td>
            <td class="bc">:</td>
            <td>{{ $setting->bank_account_name }}</td>
          </tr>
          @endif
        </table>
      </div>
      @endif
    </td>

    <td style="width:8mm;"></td>

    {{-- Logo + Signature --}}
    <td style="vertical-align:bottom; text-align:center;">
      <div class="sig-wrap">
        <img src="{{ $logoSrc }}" class="sig-img" alt="">
        <div class="sig-line"></div>
        <div class="sig-name">{{ $setting->signer_name ?? 'RR Ratih Retno Sari, S.P' }}</div>
        <div class="sig-ttl">{{ $setting->signer_title ?? 'Finance Manager' }}</div>
      </div>
    </td>
  </tr>
</table>

</div>
</body>
</html>
