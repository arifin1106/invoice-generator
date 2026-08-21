import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi, settingApi } from '../services/api';
import { formatRupiah, formatDate } from '../utils/format';
import { ArrowLeft, FileDown, Pencil, Printer, Loader2, Share2, Copy, MessageCircle } from 'lucide-react';
import ScaleToFit from '../components/ScaleToFit';

export default function InvoicePreview() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: invoice, isLoading: loadingInv } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceApi.show(id).then((r) => r.data),
  });

  const { data: setting } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingApi.show().then((r) => r.data),
  });

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await invoiceApi.downloadPdf(id, invoice?.invoice_number);
    } catch {
      alert('Gagal mengunduh PDF. Coba lagi.');
    } finally {
      setDownloading(false);
    }
  };

  const getShareUrl = () => {
    return window.location.origin + `/invoices/${id}/preview`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = getShareUrl();
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const text = `Invoice ${invoice?.invoice_number}\nSiswa: ${invoice?.student_name}\nTotal: ${formatRupiah(invoice?.total_amount)}\nSisa: ${formatRupiah(invoice?.remaining_balance)}\n\nLihat detail: ${getShareUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEmail = () => {
    const subject = `Invoice ${invoice?.invoice_number} - ${invoice?.student_name}`;
    const body = `Yth Bapak/Ibu,\n\nBersama ini kami sampaikan invoice untuk ${invoice?.student_name}.\n\nNomor Invoice: ${invoice?.invoice_number}\nTotal: ${formatRupiah(invoice?.total_amount)}\nSisa Tagihan: ${formatRupiah(invoice?.remaining_balance)}\n\nSilakan lihat detail invoice pada link berikut:\n${getShareUrl()}\n\nTerima kasih.`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  if (loadingInv) {
    return (
      <div className="page">
        <div className="table-empty"><div className="spinner" /><p>Memuat invoice...</p></div>
      </div>
    );
  }

  if (!invoice) return null;

  const logoSrc = setting?.logo_url || null;
  const sigSrc  = setting?.signature_url || null;

  const statusMap = { paid: 'LUNAS', partial: 'SEBAGIAN', unpaid: 'BELUM LUNAS' };
  const statusCls = { paid: 'stamp-paid', partial: 'stamp-partial', unpaid: 'stamp-unpaid' };

  // Compute discount totals
  let totalBeforeDiscount = 0;
  let totalDiscount = 0;
  let totalPaid = 0;
  const hasDiscount = invoice.items?.some((item) => item.discount_type && item.discount_value);

  invoice.items?.forEach((item) => {
    const amount = parseFloat(item.amount) || 0;
    let disc = 0;
    if (item.discount_type === 'percentage') {
      disc = amount * ((parseFloat(item.discount_value) || 0) / 100);
    } else if (item.discount_type === 'fixed') {
      disc = Math.min(parseFloat(item.discount_value) || 0, amount);
    }
    totalBeforeDiscount += amount;
    totalDiscount += disc;
    totalPaid += parseFloat(item.paid_amount) || item.payments?.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) || 0;
  });

  const hasPayments = invoice.items?.some((item) => item.payments?.length > 0);

  return (
    <div className="page preview-page">
      {/* Action Bar */}
      <div className="preview-actions no-print">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="preview-action-right">
          <button className="btn btn-secondary" onClick={() => navigate(`/invoices/${id}/edit`)}>
            <Pencil size={16} /> Edit
          </button>
          <button className="btn btn-ghost" onClick={handlePrint}>
            <Printer size={16} /> Cetak
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <Loader2 size={16} className="spin-icon" /> : <FileDown size={16} />}
            {downloading ? 'Mengunduh...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Share Bar */}
      <div className="share-bar no-print">
        <span className="share-label"><Share2 size={14} /> Bagikan:</span>
        <button className="btn btn-ghost btn-sm" onClick={handleWhatsApp}>
          <MessageCircle size={14} /> WhatsApp
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleEmail}>
          Email
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleCopyLink}>
          <Copy size={14} /> {copied ? 'Tersalin!' : 'Salin Link'}
        </button>
      </div>

      {/* A4 Sheet */}
      <ScaleToFit>
        <div className="a4-sheet" ref={printRef}>
        {/* Header */}
        <div className="inv-header">
          <div className="inv-logo-block">
            {logoSrc && <img src={logoSrc} alt="Logo" className="inv-logo" onError={(e) => { e.target.style.display = 'none'; }} />}
            <div className="inv-inst-info">
              <h1 className="inv-inst-name">
                {setting?.institution_name ?? 'Jakarta Cosmopolite Islamic School'}
              </h1>
              {setting?.institution_address && <p>{setting.institution_address}</p>}
              <p>
                {setting?.institution_phone && <>Tel: {setting.institution_phone}</>}
                {setting?.institution_phone && setting?.institution_email && ' | '}
                {setting?.institution_email}
              </p>
            </div>
          </div>
          <div className="inv-title-block">
            <div className="inv-title-word">INVOICE</div>
            <div className="inv-number">{invoice.invoice_number}</div>
            <div className={`inv-stamp ${statusCls[invoice.status]}`}>
              {statusMap[invoice.status]}
            </div>
          </div>
        </div>

        <div className="inv-divider" />

        {/* Meta */}
        <div className="inv-meta">
          <table className="inv-meta-table">
            <tbody>
              <tr>
                <td className="meta-label">Nama Siswa</td>
                <td className="meta-sep">:</td>
                <td className="meta-value">{invoice.student_name}</td>
              </tr>
              <tr>
                <td className="meta-label">Level / Kelas</td>
                <td className="meta-sep">:</td>
                <td className="meta-value">{invoice.student_level}</td>
              </tr>
            </tbody>
          </table>
          <table className="inv-meta-table">
            <tbody>
              <tr>
                <td className="meta-label">Tanggal</td>
                <td className="meta-sep">:</td>
                <td className="meta-value">{formatDate(invoice.date)}</td>
              </tr>
              <tr>
                <td className="meta-label">Jatuh Tempo</td>
                <td className="meta-sep">:</td>
                <td className="meta-value">{formatDate(invoice.due_date)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items */}
        <table className="inv-items">
          <thead>
            <tr>
              <th className="th-no">#</th>
              <th>Keterangan</th>
              <th className="th-amount">Nominal</th>
              {hasDiscount && <th className="th-amount">Diskon</th>}
              <th className="th-amount">Dibayar</th>
              <th className="th-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => {
              const amount = parseFloat(item.amount) || 0;
              let disc = 0;
              if (item.discount_type === 'percentage') {
                disc = amount * ((parseFloat(item.discount_value) || 0) / 100);
              } else if (item.discount_type === 'fixed') {
                disc = Math.min(parseFloat(item.discount_value) || 0, amount);
              }
              const paid = parseFloat(item.paid_amount) || item.payments?.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) || 0;
              const itemStatus = item.status || (paid <= 0 ? 'Belum Lunas' : (paid >= amount - disc ? 'Lunas' : 'Sebagian'));

              return (
                <tr key={item.id}>
                  <td className="td-no">{i + 1}</td>
                  <td>
                    {item.description}
                    {disc > 0 && (
                      <div className="item-sub-text discount-text">
                        Diskon: {item.discount_type === 'percentage' ? `${item.discount_value}%` : formatRupiah(item.discount_value)} (-{formatRupiah(disc)})
                      </div>
                    )}
                  </td>
                  <td className="td-amount">{formatRupiah(item.amount)}</td>
                  {hasDiscount && (
                    <td className="td-amount">
                      {disc > 0 ? <span className="text-red">-{formatRupiah(disc)}</span> : '-'}
                    </td>
                  )}
                  <td className="td-amount">
                    {paid > 0 ? <span className="text-green">{formatRupiah(paid)}</span> : '-'}
                  </td>
                  <td className="td-status">
                    <span className={`badge ${itemStatus === 'Lunas' ? 'badge-paid' : itemStatus === 'Sebagian' ? 'badge-partial' : 'badge-unpaid'}`}>
                      {itemStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="inv-summary-wrapper">
          <table className="inv-summary">
            <tbody>
              {hasDiscount && (
                <>
                  <tr>
                    <td>Subtotal</td>
                    <td>{formatRupiah(totalBeforeDiscount)}</td>
                  </tr>
                  <tr>
                    <td>Total Diskon</td>
                    <td className="text-red">-{formatRupiah(totalDiscount)}</td>
                  </tr>
                </>
              )}
              <tr className="summary-total-row">
                <td>Total</td>
                <td>{formatRupiah(invoice.total_amount)}</td>
              </tr>
              <tr>
                <td>Bayaran Diterima</td>
                <td className="text-green">{formatRupiah(totalPaid)}</td>
              </tr>
              <tr className="summary-remaining-row">
                <td>Sisa Tagihan</td>
                <td className={invoice.remaining_balance > 0 ? 'text-red' : ''}>{formatRupiah(invoice.remaining_balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment History */}
        {hasPayments && (
          <div className="inv-payments-section">
            <div className="inv-payments-title">Riwayat Pembayaran</div>
            <table className="inv-payments-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Keterangan</th>
                  <th>Tanggal</th>
                  <th>Jumlah</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let payNo = 0;
                  return invoice.items?.flatMap((item) =>
                    (item.payments || []).map((payment) => (
                      <tr key={payment.id}>
                        <td>{++payNo}</td>
                        <td>{item.description}</td>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>{formatRupiah(payment.amount)}</td>
                        <td>{payment.notes || '-'}</td>
                      </tr>
                    ))
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="inv-notes">
            <strong>Catatan:</strong>
            <p>{invoice.notes}</p>
          </div>
        )}

        {/* Bank & Signature */}
        <div className="inv-footer">
          {setting?.bank_name && (
            <div className="inv-bank">
              <div className="inv-bank-title">Detail Pembayaran</div>
              <table>
                <tbody>
                  {setting.bank_name && <tr><td>Bank</td><td>:</td><td>{setting.bank_name}</td></tr>}
                  {setting.bank_account_number && <tr><td>No. Rekening</td><td>:</td><td><strong>{setting.bank_account_number}</strong></td></tr>}
                  {setting.bank_account_name && <tr><td>Atas Nama</td><td>:</td><td>{setting.bank_account_name}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <div className="inv-sig">
            <div className="sig-city">Jakarta, {formatDate(invoice.date)}</div>
            {sigSrc ? (
              <img src={sigSrc} alt="Tanda Tangan" className="sig-img" />
            ) : (
              <div className="sig-space" />
            )}
            <div className="sig-name">{setting?.signer_name ?? 'RR Ratih Retno Sari, S.P'}</div>
            <div className="sig-title">{setting?.signer_title ?? 'Finance Manager'}</div>
          </div>
        </div>
      </div>
      </ScaleToFit>
    </div>
  );
}
