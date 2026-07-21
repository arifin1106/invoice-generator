import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceApi } from '../services/api';
import { formatRupiah, formatDate, statusConfig } from '../utils/format';
import {
  Search, Eye, Pencil, Trash2, FileDown,
  FileText, TrendingUp, AlertCircle, CheckCircle,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search, status, page }],
    queryFn: () =>
      invoiceApi.list({ search, status, page, per_page: 10 }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => invoiceApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['invoices']);
      setDeleteId(null);
    },
  });

  const invoices = data?.data ?? [];

  const stats = useMemo(() => ({
    total:   data?.total ?? 0,
    paid:    invoices.filter((i) => i.status === 'paid').length,
    unpaid:  invoices.filter((i) => i.status === 'unpaid').length,
    revenue: invoices.reduce((s, i) => s + parseFloat(i.amount_received ?? 0), 0),
  }), [invoices, data]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Kelola semua invoice tagihan siswa</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: FileText,     color: 'blue',   value: data?.total ?? 0,          label: 'Total Invoice' },
          { icon: CheckCircle,  color: 'green',  value: stats.paid,                label: 'Lunas' },
          { icon: AlertCircle,  color: 'red',    value: stats.unpaid,              label: 'Belum Lunas' },
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
      <div className="table-card">
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
                    <td className="font-mono">{inv.invoice_number}</td>
                    <td className="font-medium">{inv.student_name}</td>
                    <td>{inv.student_level}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td>{formatDate(inv.due_date)}</td>
                    <td className="text-right">{formatRupiah(inv.total_amount)}</td>
                    <td className="text-right">{formatRupiah(inv.remaining_balance)}</td>
                    <td className="text-center">
                      <span className={`badge ${sc.className}`}>{sc.label}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn action-btn--view" title="Preview" onClick={() => navigate(`/invoices/${inv.id}/preview`)}><Eye size={15} /></button>
                        <button className="action-btn action-btn--edit" title="Edit" onClick={() => navigate(`/invoices/${inv.id}/edit`)}><Pencil size={15} /></button>
                        <a className="action-btn action-btn--download" title="Download PDF" href={invoiceApi.pdfUrl(inv.id)} target="_blank" rel="noreferrer"><FileDown size={15} /></a>
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
    </div>
  );
}
