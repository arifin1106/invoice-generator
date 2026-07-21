import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { invoiceApi } from '../services/api';
import { formatRupiah, toInputDate } from '../utils/format';
import { Plus, Trash2, Save, ArrowLeft, RefreshCw } from 'lucide-react';

const LEVELS = ['P1', 'P2', 'K1', 'K2', 'SD 1', 'SD 2', 'SD 3', 'SD 4', 'SD 5', 'SD 6'];

const defaultItem = { description: '', amount: '', status: 'Belum Lunas' };

export default function InvoiceForm() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const qc         = useQueryClient();
  const isEdit     = Boolean(id);
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      invoice_number:  '',
      date:            new Date().toISOString().split('T')[0],
      due_date:        '',
      student_name:    '',
      student_level:   '',
      amount_received: 0,
      notes:           '',
      items: [{ ...defaultItem }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Load existing invoice for edit
  const { data: existing } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceApi.show(id).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      reset({
        invoice_number:  existing.invoice_number,
        date:            toInputDate(existing.date),
        due_date:        toInputDate(existing.due_date),
        student_name:    existing.student_name,
        student_level:   existing.student_level,
        amount_received: existing.amount_received,
        notes:           existing.notes ?? '',
        items: existing.items.map((i) => ({
          description: i.description,
          amount:      i.amount,
          status:      i.status,
        })),
      });
    }
  }, [existing, reset]);

  // Auto-generate invoice number
  const handleGenerateNumber = async () => {
    try {
      const { data } = await invoiceApi.generateNumber();
      setValue('invoice_number', data.invoice_number);
    } catch {
      showToast('Gagal generate nomor invoice', 'error');
    }
  };

  // Auto-calculate totals
  const watchedItems = watch('items');
  const total        = watchedItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const received     = parseFloat(watch('amount_received')) || 0;
  const remaining    = total - received;

  // Mutations
  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? invoiceApi.update(id, data) : invoiceApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['invoices']);
      showToast('Invoice berhasil disimpan!', 'success');
      setTimeout(() => navigate(`/invoices/${res.data.id}/preview`), 800);
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? 'Gagal menyimpan invoice.';
      showToast(msg, 'error');
    },
  });

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const onSubmit = (data) => {
    mutation.mutate({
      ...data,
      amount_received: parseFloat(data.amount_received) || 0,
      items: data.items.map((item) => ({
        ...item,
        amount: parseFloat(item.amount) || 0,
      })),
    });
  };

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div className={`toast toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <h1 className="page-title mt-2">{isEdit ? 'Edit Invoice' : 'Buat Invoice Baru'}</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSubmit(onSubmit)}
          disabled={mutation.isPending}
        >
          <Save size={16} />
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Invoice'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid-2">
          {/* ── LEFT COLUMN ── */}
          <div className="form-section">
            <h2 className="section-title">Informasi Invoice</h2>

            {/* Invoice Number */}
            <div className="form-group">
              <label className="form-label">Nomor Invoice *</label>
              <div className="input-group">
                <input
                  className={`form-input ${errors.invoice_number ? 'input-error' : ''}`}
                  placeholder="01/JCS/INV/VII/2026"
                  {...register('invoice_number', { required: 'Nomor invoice wajib diisi' })}
                />
                <button type="button" className="input-addon" onClick={handleGenerateNumber} title="Auto-generate">
                  <RefreshCw size={15} />
                </button>
              </div>
              {errors.invoice_number && <p className="error-msg">{errors.invoice_number.message}</p>}
            </div>

            {/* Date & Due Date */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Tanggal *</label>
                <input type="date" className="form-input" {...register('date', { required: true })} />
              </div>
              <div className="form-group">
                <label className="form-label">Jatuh Tempo *</label>
                <input type="date" className="form-input" {...register('due_date', { required: true })} />
              </div>
            </div>

            {/* Student */}
            <div className="form-group">
              <label className="form-label">Nama Siswa *</label>
              <input
                className={`form-input ${errors.student_name ? 'input-error' : ''}`}
                placeholder="Masukkan nama lengkap siswa"
                {...register('student_name', { required: 'Nama siswa wajib diisi' })}
              />
              {errors.student_name && <p className="error-msg">{errors.student_name.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Level / Kelas *</label>
              <div className="input-group">
                <select
                  className="form-input"
                  {...register('student_level', { required: true })}
                >
                  <option value="">Pilih level...</option>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Catatan / Pesan</label>
              <textarea
                className="form-input form-textarea"
                rows={4}
                placeholder="Catatan konfirmasi pembayaran..."
                {...register('notes')}
              />
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div>
            {/* Items Table */}
            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">Detail Tagihan</h2>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => append({ ...defaultItem })}
                >
                  <Plus size={15} /> Tambah Baris
                </button>
              </div>

              <div className="items-editor">
                {fields.map((field, index) => (
                  <div key={field.id} className="item-row">
                    <div className="item-no">{index + 1}</div>
                    <div className="item-desc">
                      <input
                        className="form-input"
                        placeholder="Nama biaya (contoh: Registration Fee)"
                        {...register(`items.${index}.description`, { required: true })}
                      />
                    </div>
                    <div className="item-amount">
                      <input
                        type="number"
                        className="form-input text-right"
                        placeholder="0"
                        min="0"
                        {...register(`items.${index}.amount`, { min: 0 })}
                      />
                    </div>
                    <div className="item-status">
                      <select className="form-input" {...register(`items.${index}.status`)}>
                        <option>Belum Lunas</option>
                        <option>Lunas</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="item-remove"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="summary-card">
              <div className="summary-row">
                <span>Total Tagihan</span>
                <strong>{formatRupiah(total)}</strong>
              </div>
              <div className="summary-row">
                <span>Bayaran Diterima</span>
                <div className="amount-input-wrapper">
                  <input
                    type="number"
                    className="form-input text-right amount-input"
                    min="0"
                    {...register('amount_received')}
                  />
                </div>
              </div>
              <div className={`summary-row summary-row--total ${remaining <= 0 ? 'summary-row--paid' : 'summary-row--unpaid'}`}>
                <span>Sisa Tagihan</span>
                <strong>{formatRupiah(remaining)}</strong>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
