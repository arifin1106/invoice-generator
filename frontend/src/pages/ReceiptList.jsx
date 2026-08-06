import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receiptApi } from '../services/api';
import { formatRupiah, formatDate } from '../utils/format';
import {
  Search, Eye, Pencil, Trash2, FileDown, PlusCircle, Receipt
} from 'lucide-react';

export default function ReceiptList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage]         = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', { search, category, page }],
    queryFn: () =>
      receiptApi.list({ search, category, page, per_page: 10 }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => receiptApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['receipts']);
      setDeleteId(null);
    },
  });

  const receipts = data?.data ?? [];

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Kwitansi</h1>
          <p className="page-subtitle">Kelola semua kwitansi pembayaran & pembelian</p>
        </div>
        <Link to="/receipts/new" className="btn btn-primary">
          <PlusCircle size={16} />
          <span>Buat Kwitansi</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Cari nomor kwitansi atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          className="form-input filter-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          <option value="Seragam Sekolah">Seragam Sekolah</option>
          <option value="Cathering Makanan">Cathering Makanan</option>
          <option value="Jemputan Sekolah">Jemputan Sekolah</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>No Kwitansi</th>
                <th>Tanggal</th>
                <th>Diterima Dari</th>
                <th>Kategori</th>
                <th>Nominal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center">Memuat data...</td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">Belum ada data kwitansi.</td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="fw-600">{r.receipt_number}</span>
                    </td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.received_from}</td>
                    <td>
                      <span className={`badge`} style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                        {r.payment_category || 'Lainnya'}
                      </span>
                    </td>
                    <td className="fw-700">{formatRupiah(r.amount)}</td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn action-btn--view" title="Preview" onClick={() => navigate(`/receipts/${r.id}/preview`)}><Eye size={15} /></button>
                        <button className="action-btn action-btn--edit" title="Edit" onClick={() => navigate(`/receipts/${r.id}/edit`)}><Pencil size={15} /></button>
                        <button className="action-btn action-btn--download" title="Download PDF" onClick={() => receiptApi.downloadPdf(r.id, r.receipt_number)}><FileDown size={15} /></button>
                        <button className="action-btn action-btn--delete" title="Hapus" onClick={() => setDeleteId(r.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.last_page > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Sebelumnya
            </button>
            <span className="text-muted" style={{ fontSize: '13px' }}>
              Halaman {page} dari {data.last_page}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === data.last_page}
              onClick={() => setPage(p => p + 1)}
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <h3 className="modal-title mb-2">Hapus Kwitansi?</h3>
            <p className="text-muted mb-4">Data kwitansi ini akan dihapus permanen dan tidak dapat dikembalikan.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Batal</button>
              <button
                className="btn btn-danger"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
