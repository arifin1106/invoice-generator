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
.wrap {
    width: 174mm;
    margin: 0 auto;
    padding: 10mm 0 12mm;
}

.inst-name  { font-size: 12pt; font-weight: 700; color: #000; margin-bottom: 3px; }
.inst-detail{ font-size: 8pt; color: #222; line-height: 1.65; }

.logo-img { height: 65px; width: auto; max-width: 200px; }

.divider-row td { vertical-align: middle; font-size: 0; }
.div-line  { border-top: 1.5px solid #000; height: 0; }
.div-label { white-space: nowrap; font-size: 10pt; font-weight: 700; letter-spacing: 2px; padding: 0 9px; color: #000; }

.info-box {
    border: 1px solid #888;
    padding: 5px 8px;
    font-size: 8.5pt;
    line-height: 1.6;
}
.box-title { font-weight: 700; font-size: 8.5pt; margin-bottom: 2px; }

.items { width: 100%; border-collapse: collapse; }
.items th {
    border: 1px solid #888;
    padding: 4px 5px;
    font-size: 8pt;
    font-weight: 700;
    background: #f2f2f2;
    text-align: left;
}
.items td {
    border: 1px solid #888;
    padding: 4px 5px;
    font-size: 8pt;
}
.items .cn { width: 4%;  text-align: center; }
.items .cd { width: 30%; }
.items .ca { width: 16%; text-align: right; }
.items .cdisc { width: 14%; text-align: right; }
.items .cpd { width: 16%; text-align: right; }
.items .cs { width: 20%; text-align: center; }

.item-sub { font-size: 7pt; color: #555; margin-top: 2px; line-height: 1.4; }
.discount-text { color: #c0392b; }
.paid-text { color: #27ae60; }

.sum { width: 100%; border-collapse: collapse; border-top: 0; }
.sum td { font-size: 8.5pt; padding: 4px 5px; }
.sum .se { width: 34%; border: 0; }
.sum .sl {
    width: 44%;
    border: 1px solid #888;
    border-top: none;
    text-align: right;
    font-weight: 600;
}
.sum .sa {
    width: 22%;
    border: 1px solid #888;
    border-top: none;
    text-align: right;
    font-weight: 700;
}
.sum .sa-green { color: #27ae60; }
.sum .sa-red { color: #c0392b; }
.sum-total { background: #e8f4fd; }

.notes-box {
    border: 1px solid #888;
    padding: 6px 8px;
    font-size: 8pt;
    line-height: 1.65;
}
.notes-title { font-weight: 700; font-size: 8.5pt; margin-bottom: 3px; }

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

.sig-wrap { text-align: center; }
.sig-img  { height: 60px; width: auto; max-width: 150px; }
.sig-line { border-top: 1px solid #111; width: 130px; margin: 5px auto 3px; }
.sig-name { font-size: 9pt; font-weight: 700; }
.sig-ttl  { font-size: 8pt; color: #555; }

.sp3 { height: 3mm; }
.sp4 { height: 4mm; }
.sp5 { height: 5mm; }
.sp6 { height: 6mm; }
.sp8 { height: 8mm; }

.payments-box {
    border: 1px solid #888;
    padding: 5px 8px;
    font-size: 7.5pt;
    line-height: 1.5;
}
.payments-title { font-weight: 700; font-size: 8pt; margin-bottom: 3px; }
.payments-tbl { width: 100%; border-collapse: collapse; }
.payments-tbl th {
    background: #f5f5f5;
    border: 1px solid #aaa;
    padding: 2px 4px;
    font-size: 7pt;
    font-weight: 700;
    text-align: left;
}
.payments-tbl td {
    border: 1px solid #aaa;
    padding: 2px 4px;
    font-size: 7pt;
}
</style>
</head>
<body>
<div class="wrap">

@php
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

    $logoSrc = '';
    if ($setting && $setting->institution_logo) {
        $logoSrc = $toBase64(storage_path('app/public/' . $setting->institution_logo));
    }
    if (!$logoSrc) {
        $logoSrc = $toBase64(public_path('asset/logo-JACOS.png'));
    }

    $sigSrc = '';
    if ($setting && $setting->signer_signature) {
        $sigSrc = $toBase64(storage_path('app/public/' . $setting->signer_signature));
    }
    if (!$sigSrc) {
        $sigSrc = $toBase64(public_path('asset/ttd-ratih.png'));
    }

    $hasNote = !empty(trim($invoice->notes ?? '')) || !empty(trim($setting?->payment_message ?? ''));

    $totalBeforeDiscount = 0;
    $totalDiscount = 0;
    $totalPaid = 0;
    foreach ($invoice->items as $item) {
        $itemDiscount = 0;
        if ($item->discount_type && $item->discount_value) {
            if ($item->discount_type === 'percentage') {
                $itemDiscount = $item->amount * ($item->discount_value / 100);
            } else {
                $itemDiscount = min((float) $item->discount_value, (float) $item->amount);
            }
        }
        $totalBeforeDiscount += (float) $item->amount;
        $totalDiscount += $itemDiscount;
        $totalPaid += (float) $item->payments->sum('amount');
    }

    $hasDiscount = $totalDiscount > 0;
    $hasPayments = $invoice->items->flatMap->payments->count() > 0;
@endphp

{{-- HEADER --}}
<table style="width:100%; border-collapse:collapse;">
  <tr>
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
    <td style="vertical-align:top; width:40%; text-align:right;">
      @if($logoSrc)
        <img src="{{ $logoSrc }}" class="logo-img" alt="">
      @endif
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

{{-- INVOICE DIVIDER --}}
<table style="width:100%; border-collapse:collapse;" class="divider-row">
  <tr>
    <td style="width:44%; height:2px;" class="div-line"></td>
    <td class="div-label" style="text-align:center; font-size:10pt; font-weight:700; letter-spacing:2px; white-space:nowrap; padding:0 9px;">INVOICE</td>
    <td style="width:44%; height:2px;" class="div-line"></td>
  </tr>
</table>

<div class="sp4"></div>

{{-- STUDENT + DUE DATE --}}
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

{{-- ITEMS TABLE --}}
<table class="items">
  <thead>
    <tr>
      <th class="cn">No</th>
      <th class="cd">Keterangan</th>
      <th class="ca">Nominal</th>
      @if($hasDiscount)
      <th class="cdisc">Diskon</th>
      @endif
      <th class="cpd">Dibayar</th>
      <th class="cs">Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($invoice->items as $i => $item)
    @php
        $itemDiscount = 0;
        if ($item->discount_type && $item->discount_value) {
            if ($item->discount_type === 'percentage') {
                $itemDiscount = $item->amount * ($item->discount_value / 100);
            } else {
                $itemDiscount = min((float) $item->discount_value, (float) $item->amount);
            }
        }
        $itemPaid = (float) $item->payments->sum('amount');
        $itemFinal = (float) $item->amount - $itemDiscount;
    @endphp
    <tr>
      <td class="cn">{{ $i + 1 }}</td>
      <td class="cd">
        {{ $item->description }}
        @if($itemDiscount > 0)
        <div class="item-sub discount-text">
          Diskon: @if($item->discount_type === 'percentage'){{ $item->discount_value }}%@else Rp {{ number_format($item->discount_value, 0, ',', '.') }}@endif
          (-Rp {{ number_format($itemDiscount, 0, ',', '.') }})
        </div>
        @endif
      </td>
      <td class="ca">Rp {{ number_format($item->amount, 0, ',', '.') }}</td>
      @if($hasDiscount)
      <td class="cdisc">
        @if($itemDiscount > 0)
          <span class="discount-text">-Rp {{ number_format($itemDiscount, 0, ',', '.') }}</span>
        @else
          -
        @endif
      </td>
      @endif
      <td class="cpd">
        @if($itemPaid > 0)
          <span class="paid-text">Rp {{ number_format($itemPaid, 0, ',', '.') }}</span>
        @else
          -
        @endif
      </td>
      <td class="cs">{{ $item->status ?? ($itemPaid <= 0 ? 'Belum Lunas' : ($itemPaid >= $itemFinal ? 'Lunas' : 'Sebagian')) }}</td>
    </tr>
    @endforeach
  </tbody>
</table>

{{-- Summary --}}
<table class="sum">
  @if($hasDiscount)
  <tr>
    <td class="se"></td>
    <td class="sl">Subtotal</td>
    <td class="sa">Rp {{ number_format($totalBeforeDiscount, 0, ',', '.') }}</td>
  </tr>
  <tr>
    <td class="se"></td>
    <td class="sl">Total Diskon</td>
    <td class="sa sa-red">-Rp {{ number_format($totalDiscount, 0, ',', '.') }}</td>
  </tr>
  @endif
  <tr>
    <td class="se"></td>
    <td class="sl sum-total" style="border-top: 1.5px solid #555; font-weight:700;">Total</td>
    <td class="sa sum-total" style="border-top: 1.5px solid #555;">Rp {{ number_format($invoice->total_amount, 0, ',', '.') }}</td>
  </tr>
  <tr>
    <td class="se"></td>
    <td class="sl">Bayaran Diterima</td>
    <td class="sa sa-green">Rp {{ number_format($totalPaid, 0, ',', '.') }}</td>
  </tr>
  <tr>
    <td class="se"></td>
    <td class="sl">Sisa Tagihan</td>
    <td class="sa @if($invoice->remaining_balance > 0)sa-red @endif">Rp {{ number_format($invoice->remaining_balance, 0, ',', '.') }}</td>
  </tr>
</table>

{{-- PAYMENTS HISTORY --}}
@if($hasPayments)
<div class="sp4"></div>
<div class="payments-box">
  <div class="payments-title">Riwayat Pembayaran</div>
  <table class="payments-tbl">
    <thead>
      <tr>
        <th style="width:5%;">No</th>
        <th style="width:30%;">Keterangan</th>
        <th style="width:25%;">Tanggal</th>
        <th style="width:20%;">Jumlah</th>
        <th style="width:20%;">Keterangan</th>
      </tr>
    </thead>
    <tbody>
      @php $payNo = 1; @endphp
      @foreach($invoice->items as $item)
        @foreach($item->payments as $payment)
        <tr>
          <td>{{ $payNo++ }}</td>
          <td>{{ $item->description }}</td>
          <td>{{ $payment->payment_date->format('d/m/Y') }}</td>
          <td>Rp {{ number_format($payment->amount, 0, ',', '.') }}</td>
          <td>{{ $payment->notes ?? '-' }}</td>
        </tr>
        @endforeach
      @endforeach
    </tbody>
  </table>
</div>
@endif

{{-- PESAN / NOTES --}}
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

{{-- FOOTER --}}
<table style="width:100%; border-collapse:collapse;">
  <tr>
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
    <td style="vertical-align:bottom; text-align:center;">
      <div class="sig-wrap">
        @if($sigSrc)
          <img src="{{ $sigSrc }}" class="sig-img" alt="">
        @endif
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
