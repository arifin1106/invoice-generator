import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { receiptApi, settingApi } from '../services/api';
import { ArrowLeft, FileDown, Loader2, Share2, Copy, MessageCircle, Mail } from 'lucide-react';
import { formatRupiah, formatDate } from '../utils/format';
import { sharePdfViaWhatsApp } from '../utils/share';
import ScaleToFit from '../components/ScaleToFit';

export default function ReceiptPreview() {
  const { id } = useParams();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const { data: receipt, isLoading: receiptLoading } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptApi.show(id).then(r => r.data),
  });

  const { data: setting } = useQuery({
    queryKey: ['setting'],
    queryFn: () => settingApi.show().then(r => r.data),
  });

  if (receiptLoading) return <div className="page p-24">Memuat preview...</div>;
  if (!receipt) return <div className="page p-24">Data tidak ditemukan.</div>;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await receiptApi.downloadPdf(id, receipt.receipt_number);
    } catch (e) {
      console.error(e);
      alert('Gagal mendownload kwitansi.');
    } finally {
      setDownloading(false);
    }
  };

  const getShareUrl = async () => {
    if (shareLink) return shareLink;
    const { data } = await receiptApi.shareUrl(id);
    setShareLink(data.url);
    return data.url;
  };

  const handleWhatsApp = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const url = await getShareUrl();
      await sharePdfViaWhatsApp({
        endpoint: `/receipts/${id}/pdf`,
        filename: `Kwitansi-${receipt.receipt_number.replace(/\//g, '-')}.pdf`,
        text: `Kwitansi ${receipt.receipt_number}\nTelah terima dari: ${receipt.received_from}\nJumlah: ${formatRupiah(receipt.amount)}\n\nUnduh PDF kwitansi:\n${url}`,
      });
    } catch (e) {
      console.error(e);
      alert('Gagal mengirim PDF via WhatsApp. Coba lagi.');
    } finally {
      setSharing(false);
    }
  };

  const handleEmail = async () => {
    try {
      const url = await getShareUrl();
      const subject = `Kwitansi ${receipt.receipt_number}`;
      const body = `Telah terima dari: ${receipt.received_from}\nJumlah: ${formatRupiah(receipt.amount)}\n\nLihat / unduh kwitansi:\n${url}\n\nTerima kasih.`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch {
      alert('Gagal membuat link berbagi. Coba lagi.');
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = await getShareUrl();
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Gagal membuat link berbagi. Coba lagi.');
    }
  };

  const city = setting?.institution_address ? setting.institution_address.split(',')[0] : 'Jakarta';

  return (
    <div className="page p-24" style={{ background: 'var(--surface-0)' }}>
      {/* Action Bar */}
      <div className="preview-action-bar">
        <Link to="/receipts" className="btn btn-ghost" style={{ padding: '8px' }}>
          <ArrowLeft size={18} />
          <span>Kembali</span>
        </Link>
        <div style={{ display: 'flex', gap: '10px' }}>
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
        <button className="btn btn-ghost btn-sm share-wa-btn" onClick={handleWhatsApp} disabled={sharing}>
          {sharing ? <Loader2 size={14} className="spin-icon" /> : <MessageCircle size={14} />}
          {sharing ? 'Menyiapkan...' : 'Kirim PDF via WhatsApp'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleCopyLink}>
          <Copy size={14} /> {copied ? 'Tersalin!' : 'Salin Link'}
        </button>
      </div>

      {/* Sticky Bottom Bar (mobile only) */}
      <div className="preview-bottombar no-print">
        <button className="btn btn-ghost" onClick={handleWhatsApp} disabled={sharing}>
          {sharing ? <Loader2 size={16} className="spin-icon" /> : <MessageCircle size={16} />}
          WhatsApp
        </button>
        <button className="btn btn-ghost" onClick={handleEmail}>
          <Mail size={16} /> Email
        </button>
        <button
          className="btn btn-primary preview-bottombar-primary"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? <Loader2 size={16} className="spin-icon" /> : <FileDown size={16} />}
          {downloading ? 'Mengunduh...' : 'Download PDF'}
        </button>
      </div>

      {/* A4 landscape sheet mockup */}
      <div className="preview-a4">
      <ScaleToFit baseWidth={800}>
        <div className="a4-sheet" style={{ maxWidth: '800px', margin: '20px auto', padding: '30px', position: 'relative' }}>
        <div style={{ border: '2px solid #000', padding: '30px', borderRadius: '8px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
            <div style={{ width: '25%' }}>
              {setting?.institution_logo ? (
                <img
                  src={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}/storage/${setting.institution_logo}` : `/storage/${setting.institution_logo}`}
                  alt="Logo"
                  style={{ maxHeight: '70px', maxWidth: '100%' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                />
              ) : (
                <div style={{ fontWeight: 'bold', fontSize: '18pt' }}>JACOS</div>
              )}
              <div style={{ fontWeight: 'bold', fontSize: '18pt', display: 'none' }}>JACOS</div>
            </div>
            
            <div style={{ width: '50%', textAlign: 'center' }}>
              <h1 style={{ fontSize: '24pt', fontWeight: 700, letterSpacing: '3px', textDecoration: 'underline' }}>KWITANSI</h1>
              <p style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '5px' }}>No. {receipt.receipt_number}</p>
            </div>
            
            <div style={{ width: '25%' }}></div>
          </div>

          <table style={{ width: '100%', marginBottom: '40px', fontSize: '12pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '200px', padding: '10px 0', fontWeight: 600 }}>Telah terima dari</td>
                <td style={{ width: '20px', textAlign: 'center' }}>:</td>
                <td style={{ borderBottom: '1px dotted #000', fontStyle: 'italic', padding: '10px 5px' }}>
                  {receipt.received_from}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '15px 0', fontWeight: 600, verticalAlign: 'top' }}>Uang sejumlah</td>
                <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '15px' }}>:</td>
                <td style={{ padding: '15px 5px' }}>
                  <div style={{ background: '#f2f2f2', padding: '15px', border: '1px solid #000', borderRadius: '4px', fontWeight: 'bold', fontStyle: 'italic', fontSize: '13pt' }}>
                    # {receipt.amount_in_words} #
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px 0', fontWeight: 600 }}>Untuk pembayaran</td>
                <td style={{ textAlign: 'center' }}>:</td>
                <td style={{ borderBottom: '1px dotted #000', fontStyle: 'italic', padding: '10px 5px' }}>
                  {receipt.payment_category && <strong>[{receipt.payment_category}] </strong>}
                  {receipt.description}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ border: '2px solid #000', padding: '15px 25px', fontSize: '20pt', fontWeight: 'bold', borderRadius: '4px', background: '#fdfdfd' }}>
              {formatRupiah(receipt.amount)}
            </div>

            <div style={{ textAlign: 'center', width: '250px', maxWidth: '45%' }}>
              <div style={{ marginBottom: '70px', fontSize: '12pt' }}>
                {city}, {formatDate(receipt.date)}
              </div>
              <div style={{ borderBottom: '1px solid #000', width: '100%' }}></div>
              <div style={{ fontWeight: 'bold', fontSize: '12pt', marginTop: '5px' }}>Penerima</div>
            </div>
          </div>

        </div>
      </div>
      </ScaleToFit>
      </div>

      {/* Mobile reflow document */}
      <div className="preview-mdoc no-print">
        <div className="mdoc-card">
          <div className="mdoc-dochead mdoc-dochead--center">
            <span className="mdoc-doctitle">KWITANSI</span>
            <span className="mdoc-docno">No. {receipt.receipt_number}</span>
          </div>
          <div className="mdoc-meta">
            <div className="mdoc-meta-row">
              <span className="mdoc-meta-label">Telah terima dari</span>
              <span className="mdoc-meta-value">{receipt.received_from}</span>
            </div>
            <div className="mdoc-meta-row">
              <span className="mdoc-meta-label">Tanggal</span>
              <span className="mdoc-meta-value">{formatDate(receipt.date)}</span>
            </div>
            <div className="mdoc-meta-row">
              <span className="mdoc-meta-label">Untuk pembayaran</span>
              <span className="mdoc-meta-value">
                {receipt.payment_category && (
                  <span className="badge" style={{ marginRight: '6px' }}>[{receipt.payment_category}]</span>
                )}
                {receipt.description}
              </span>
            </div>
          </div>
          <div className="mdoc-amount-box">{formatRupiah(receipt.amount)}</div>
          <div className="mdoc-terbilang"># {receipt.amount_in_words} #</div>
        </div>

        <div className="mdoc-card">
          <div className="mdoc-sig">
            <div className="mdoc-date">{city}, {formatDate(receipt.date)}</div>
            <div className="mdoc-sig-space" />
            <div className="mdoc-sig-line">Penerima</div>
          </div>
        </div>
      </div>
    </div>
  );
}
