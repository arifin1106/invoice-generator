import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi, settingApi } from '../services/api';
import { formatRupiah, formatDate } from '../utils/format';
import { ArrowLeft, FileDown, Pencil, Printer, Loader2 } from 'lucide-react';

export default function InvoicePreview() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [downloading, setDownloading] = useState(false);

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
    } catch (e) {
      alert('Gagal mengunduh PDF. Coba lagi.');
    } finally {
      setDownloading(false);
    }
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

      {/* A4 Sheet */}
      <div className="a4-sheet" ref={printRef}>
        {/* Header */}
        <div className="inv-header">
          <div className="inv-logo-block">
            <img src={logoSrc} alt="Logo" className="inv-logo" onError={(e) => { e.target.style.display='none'; }} />
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
              <th className="th-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={item.id}>
                <td className="td-no">{i + 1}</td>
                <td>{item.description}</td>
                <td className="td-amount">{formatRupiah(item.amount)}</td>
                <td className="td-status">
                  <span className={`badge ${item.status === 'Lunas' ? 'badge-paid' : 'badge-unpaid'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="inv-summary-wrapper">
          <table className="inv-summary">
            <tbody>
              <tr className="summary-total-row">
                <td>Total</td>
                <td>{formatRupiah(invoice.total_amount)}</td>
              </tr>
              <tr>
                <td>Bayaran Diterima</td>
                <td>{formatRupiah(invoice.amount_received)}</td>
              </tr>
              <tr className="summary-remaining-row">
                <td>Sisa Tagihan</td>
                <td>{formatRupiah(invoice.remaining_balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

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
    </div>
  );
}
