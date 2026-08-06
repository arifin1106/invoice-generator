import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receiptApi } from '../services/api';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function ReceiptForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    receipt_number: '',
    date: new Date().toISOString().split('T')[0],
    received_from: '',
    amount: '',
    payment_category: 'Seragam Sekolah',
    description: '',
  });

  const { data: initialData, isLoading: isFetching } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptApi.show(id).then(r => r.data),
    enabled: isEdit,
  });

  const generateNumMutation = useMutation({
    mutationFn: () => receiptApi.generateNumber().then(r => r.data),
    onSuccess: (data) => setFormData(p => ({ ...p, receipt_number: data.receipt_number })),
  });

  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        receipt_number: initialData.receipt_number,
        date: initialData.date,
        received_from: initialData.received_from,
        amount: initialData.amount,
        payment_category: initialData.payment_category || 'Lainnya',
        description: initialData.description || '',
      });
    } else if (!isEdit) {
      generateNumMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialData]);

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? receiptApi.update(id, data) : receiptApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['receipts']);
      navigate('/receipts');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isEdit && isFetching) return <div className="page p-24">Memuat data...</div>;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link to="/receipts" className="btn btn-ghost" style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Kwitansi' : 'Buat Kwitansi Baru'}</h1>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} className="invoice-form">
          
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">No. Kwitansi</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.receipt_number}
                onChange={e => setFormData({ ...formData, receipt_number: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input
                type="date"
                className="form-input"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Telah terima dari (Nama Pembayar)</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Contoh: Budi Santoso"
              value={formData.received_from}
              onChange={e => setFormData({ ...formData, received_from: e.target.value })}
            />
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Nominal (Rp)</label>
            <input
              type="number"
              className="form-input"
              required
              min="0"
              placeholder="Contoh: 150000"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
            <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
              *Terbilang (huruf) akan digenerate otomatis oleh sistem pada PDF.
            </p>
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Kategori Pembayaran</label>
            <select
              className="form-input"
              required
              value={formData.payment_category}
              onChange={e => setFormData({ ...formData, payment_category: e.target.value })}
            >
              <option value="Seragam Sekolah">Seragam Sekolah</option>
              <option value="Cathering Makanan">Cathering Makanan</option>
              <option value="Jemputan Sekolah">Jemputan Sekolah</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Deskripsi Tambahan</label>
            <textarea
              className="form-input"
              rows="3"
              placeholder="Catatan tambahan atau rincian (opsional)"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link to="/receipts" className="btn btn-secondary">Batal</Link>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isLoading}>
              {saveMutation.isLoading ? <Loader2 size={16} className="spin-icon" /> : <Save size={16} />}
              <span>Simpan Kwitansi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
