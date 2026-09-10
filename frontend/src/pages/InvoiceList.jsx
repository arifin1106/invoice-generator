import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { invoiceApi } from '../services/api';
import { formatRupiah, formatDate, statusConfig } from '../utils/format';
import useDebounce from '../hooks/useDebounce';
import {
  Search, Eye, Pencil, Trash2, FileDown,
  FileText, TrendingUp, AlertCircle, CheckCircle,
  Download, Upload, X, FileSpreadsheet, Loader2,
} from 'lucide-react';

const CATEGORY_LEVELS = {
  preschool: 'P1,P2,K1,K2',
  primary:   'Primary',
};

const CATEGORY_LABELS = {
  preschool: 'Preschool & Kindergarten',
  primary:   'Primary',
};

export default function InvoiceList({ category }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile]         = useState(null);
  const [importLoading, setImportLoading]   = useState(false);
  const [importResult, setImportResult]     = useState(null);
  const fileInputRef = useRef(null);

  const debouncedSearch = useDebounce(search);
  const studentLevel = CATEGORY_LEVELS[category] ?? '';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['invoices', { search: debouncedSearch, status, page, student_level: studentLevel }],
    queryFn: () =>
      invoiceApi.list({ search: debouncedSearch, status, page, per_page: 10, student_level: studentLevel }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => invoiceApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['invoices']);
      setDeleteId(null);
    },
  });

  /* Export to XLSX */
  const handleExport = async () => {
    try {
      const res = await invoiceApi.exportXlsx(studentLevel || undefined);
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-Export-${CATEGORY_LABELS[category] || 'Semua'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh file export.');
    }
  };

  /* Download import template */
  const handleDownloadTemplate = async () => {
    try {
      const res = await invoiceApi.downloadTemplate();
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Template-Import-Invoice.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh template.');
    }
  };

  /* Import XLSX */
  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await invoiceApi.importXlsx(importFile);
      setImportResult(res.data);
      qc.invalidateQueries(['invoices']);
    } catch (err) {
      setImportResult({
        message: err.response?.data?.message || 'Gagal melakukan import.',
        imported: 0,
        skipped: 0,
        errors: [],
      });
    } finally {
      setImportLoading(false);
    }
  };

  const invoices = data?.data ?? [];

  const stats = useMemo(() => ({
    total:   data?.total ?? 0,
    paid:    data?.stats?.paid ?? 0,
    partial: data?.stats?.partial ?? 0,
    unpaid:  data?.stats?.unpaid ?? 0,
    revenue: data?.stats?.revenue ?? 0,
  }), [data]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice {CATEGORY_LABELS[category] ?? ''}</h1>
          <p className="page-subtitle">Daftar invoice untuk kategori {CATEGORY_LABELS[category] ?? ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={15} />
            <span>Export Excel</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowImportModal(true); setImportResult(null); setImportFile(null); }}>
            <Upload size={15} />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: FileText,     color: 'blue',   value: stats.total,                 label: 'Total Invoice' },
          { icon: CheckCircle,  color: 'green',  value: stats.paid,                  label: 'Lunas' },
          { icon: AlertCircle,  color: 'orange', value: stats.partial,               label: 'Sebagian' },
          { icon: AlertCircle,  color: 'red',    value: stats.unpaid,                label: 'Belum Lunas' },
          { icon: TrendingUp,   color: 'purple', value: formatRupiah(stats.revenue), label: 'Total Diterima' },
        ].map(({ icon: Icon, color, value, label }) => (
          <div key={label} className="stat-card">
            <div className={`stat-icon stat-icon--${color}`}><Icon size={20} /></div>
            <div className="stat-info">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Cari nama siswa atau nomor invoice..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="search-input"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="filter-select">
          <option value="">Semua Status</option>
          <option value="paid">Lunas</option>
          <option value="partial">Sebagian</option>
          <option value="unpaid">Belum Lunas</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-card" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        {isLoading ? (
          <div className="table-empty"><div className="spinner" /><p>Memuat data...</p></div>
        ) : invoices.length === 0 ? (
          <div className="table-empty">
            <FileText size={48} className="empty-icon" />
            <p>Belum ada invoice. <span className="link" onClick={() => navigate('/invoices/new')}>Buat sekarang</span></p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Nama Siswa</th>
                <th>Level</th>
                <th>Tanggal</th>
                <th>Jatuh Tempo</th>
                <th className="text-right">Total</th>
                <th className="text-right">Sisa</th>
                <th className="text-center">Status</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const sc = statusConfig[inv.status] ?? statusConfig.unpaid;
                return (
                  <tr key={inv.id}>
                    <td className="font-mono" data-label="No. Invoice">{inv.invoice_number}</td>
                    <td className="font-medium" data-label="Nama Siswa">{inv.student_name}</td>
                    <td data-label="Level">{inv.student_level}</td>
                    <td data-label="Tanggal">{formatDate(inv.date)}</td>
                    <td data-label="Jatuh Tempo">{formatDate(inv.due_date)}</td>
                    <td className="text-right" data-label="Total">{formatRupiah(inv.total_amount)}</td>
                    <td className="text-right" data-label="Sisa">{formatRupiah(inv.remaining_balance)}</td>
                    <td className="text-center" data-label="Status">
                      <span className={`badge ${sc.className}`}>{sc.label}</span>
                    </td>
                    <td className="text-center" data-label="Aksi">
                      <div className="action-btns">
                        <button className="action-btn action-btn--view" title="Preview" onClick={() => navigate(`/invoices/${inv.id}/preview`)}><Eye size={15} /></button>
                        <button className="action-btn action-btn--edit" title="Edit" onClick={() => navigate(`/invoices/${inv.id}/edit`)}><Pencil size={15} /></button>
                        <button className="action-btn action-btn--download" title="Download PDF" onClick={() => invoiceApi.downloadPdf(inv.id, inv.invoice_number)}><FileDown size={15} /></button>
                        <button className="action-btn action-btn--delete" title="Hapus" onClick={() => setDeleteId(inv.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data?.last_page > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Sebelumnya</button>
          <span className="page-info">Halaman {page} dari {data.last_page}</span>
          <button className="btn btn-ghost" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Berikutnya →</button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Hapus Invoice?</h3>
            <p className="modal-body">Tindakan ini tidak dapat dibatalkan. Invoice akan dihapus permanen.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Batal</button>
              <button className="btn btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteId)}>
                {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal modal--import" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Import Invoice dari Excel</h3>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>
                <X size={18} />
              </button>
            </div>

            {!importResult ? (
              <div className="modal-body">
                <div className="import-dropzone" onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet size={40} className="empty-icon" />
                  {importFile ? (
                    <p className="import-filename">{importFile.name}</p>
                  ) : (
                    <p>Klik untuk memilih file <strong>.xlsx</strong></p>
                  )}
                  <p className="import-hint">Maks. 10 MB. Format sesuai template.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="import-actions">
                  <button className="btn btn-ghost btn-sm" onClick={handleDownloadTemplate} disabled={importLoading}>
                    <Download size={14} />
                    <span>Unduh Template</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-body">
                <div className={`import-result import-result--${importResult.imported > 0 ? 'success' : 'warning'}`}>
                  <div className="import-result-icon">
                    {importResult.imported > 0 ? <CheckCircle size={36} /> : <AlertCircle size={36} />}
                  </div>
                  <p className="import-result-msg">{importResult.message}</p>
                  <div className="import-result-stats">
                    <span className="import-stat import-stat--ok">{importResult.imported} berhasil</span>
                    <span className="import-stat import-stat--skip">{importResult.skipped} dilewati</span>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <ul className="import-result-errors">
                      {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {importResult ? (
                <button className="btn btn-primary btn-sm" onClick={() => setShowImportModal(false)}>Tutup</button>
              ) : (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}>Batal</button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!importFile || importLoading}
                    onClick={handleImport}
                  >
                    {importLoading ? <><Loader2 size={14} className="spin-icon" /> Mengimport...</> : 'Import Sekarang'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
