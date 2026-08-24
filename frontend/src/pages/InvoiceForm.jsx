import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { invoiceApi, paymentCategoryApi } from '../services/api';
import { formatRupiah, toInputDate } from '../utils/format';
import { LEVELS } from '../utils/constants';
import { Plus, Trash2, Save, ArrowLeft, RefreshCw, ChevronDown, ChevronUp, Wallet } from 'lucide-react';

const defaultItem = {
  description: '',
  amount: '',
  discount_type: '',
  discount_value: '',
  status: 'Belum Lunas',
  payments: [],
};

const defaultPayment = { amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' };

export default function InvoiceForm() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const qc         = useQueryClient();
  const isEdit     = Boolean(id);
  const [toast, setToast] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      invoice_number: '',
      date:           new Date().toISOString().split('T')[0],
      due_date:       '',
      student_name:   '',
      student_level:  '',
      notes:          '',
      items: [{ ...defaultItem }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Fetch payment categories for quick-add
  const { data: categories } = useQuery({
    queryKey: ['payment-categories'],
    queryFn: () => paymentCategoryApi.list().then((r) => r.data),
  });

  // Load existing invoice for edit
  const { data: existing } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceApi.show(id).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      reset({
        invoice_number: existing.invoice_number,
        date:           toInputDate(existing.date),
        due_date:       toInputDate(existing.due_date),
        student_name:   existing.student_name,
        student_level:  existing.student_level,
        notes:          existing.notes ?? '',
        items: existing.items.map((i) => ({
          description:    i.description,
          amount:         i.amount,
          discount_type:  i.discount_type ?? '',
          discount_value: i.discount_value ?? '',
          status:         i.status,
          payments:       (i.payments || []).map((p) => ({
            id:           p.id,
            amount:       p.amount,
            payment_date: toInputDate(p.payment_date),
            notes:        p.notes ?? '',
          })),
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

  useEffect(() => {
    if (!isEdit) {
      handleGenerateNumber();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Toggle expand/collapse for item payments
  const toggleExpand = (index) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Quick add: isi baris yang sedang difokuskan; fallback baris kosong tunggal; terakhir tambah baris baru
  const handleQuickAdd = (cat) => {
    const idx = activeRowIndex !== null && fields[activeRowIndex] ? activeRowIndex : null;

    if (idx !== null) {
      setValue(`items.${idx}.description`, cat.name, { shouldValidate: true });
      setValue(`items.${idx}.amount`, cat.default_amount);
      return;
    }

    const onlyOneEmptyRow =
      fields.length === 1 &&
      !watchedItems[0]?.description &&
      !(parseFloat(watchedItems[0]?.amount) || 0);

    if (onlyOneEmptyRow) {
      setValue('items.0.description', cat.name, { shouldValidate: true });
      setValue('items.0.amount', cat.default_amount);
      return;
    }

    append({
      ...defaultItem,
      description: cat.name,
      amount: cat.default_amount,
      payments: [],
    });
  };

  // Auto-calculate totals
  const watchedItems = watch('items') || [];
  const watchedLevel = watch('student_level');
  const computed = watchedItems.reduce(
    (acc, item) => {
      const amount      = parseFloat(item.amount) || 0;
      const discType    = item.discount_type;
      const discValue   = parseFloat(item.discount_value) || 0;
      let discountAmount = 0;

      if (discType === 'percentage' && discValue > 0) {
        discountAmount = amount * (discValue / 100);
      } else if (discType === 'fixed' && discValue > 0) {
        discountAmount = Math.min(discValue, amount);
      }

      const finalAmount = amount - discountAmount;
      const paidAmount  = (item.payments || []).reduce(
        (sum, p) => sum + (parseFloat(p.amount) || 0),
        0
      );

      return {
        totalBeforeDiscount: acc.totalBeforeDiscount + amount,
        totalDiscount:       acc.totalDiscount + discountAmount,
        totalFinal:          acc.totalFinal + finalAmount,
        totalPaid:           acc.totalPaid + paidAmount,
      };
    },
    { totalBeforeDiscount: 0, totalDiscount: 0, totalFinal: 0, totalPaid: 0 }
  );

  const remaining = Math.max(0, computed.totalFinal - computed.totalPaid);

  // Mutations
  const mutation = useMutation({
    mutationFn: (data) => {
      return isEdit ? invoiceApi.update(id, data) : invoiceApi.create(data);
    },
    onSuccess: (res) => {
      qc.invalidateQueries(['invoices']);
      showToast('Invoice berhasil disimpan!', 'success');
      setTimeout(() => navigate(`/invoices/${res.data.id}/preview`), 800);
    },
    onError: (err) => {
      let msg = err.response?.data?.message ?? 'Gagal menyimpan invoice.';
      if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0][0];
        if (firstError) msg = firstError;
      }
      showToast(msg, 'error');
    },
  });

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const onSubmit = (data) => {
    const sanitized = {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        amount:         parseFloat(item.amount) || 0,
        discount_type:  item.discount_type || null,
        discount_value: parseFloat(item.discount_value) || null,
        payments:       (item.payments || [])
          .filter((p) => parseFloat(p.amount) > 0)
          .map((p) => ({
            ...p,
            amount:       parseFloat(p.amount) || 0,
            payment_date: p.payment_date,
          })),
      })),
    };
    mutation.mutate(sanitized);
  };

  const hasDiscountItems = watchedItems.some(
    (item) => item.discount_type && parseFloat(item.discount_value) > 0
  );

  return (
    <div className="page">
      {toast && (
        <div className={`toast toast--${toast.type}`}>{toast.msg}</div>
      )}

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
          {/* LEFT COLUMN */}
          <div className="form-section">
            <h2 className="section-title">Informasi Invoice</h2>

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
              <select className="form-input" {...register('student_level', { required: true })}>
                <option value="">Pilih level...</option>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>

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

          {/* RIGHT COLUMN */}
          <div>
            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">Detail Tagihan</h2>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => append({ ...defaultItem, payments: [] })}
                >
                  <Plus size={15} /> Tambah Baris
                </button>
              </div>

              {categories && categories.length > 0 && (
                <div className="category-quick-add">
                  {watchedLevel ? (
                    <>
                      <span className="category-label">Quick add ({watchedLevel}):</span>
                      {categories
                        .filter((c) => c.is_active && c.student_level === watchedLevel)
                        .map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            className="category-chip"
                            onClick={() => handleQuickAdd(cat)}
                          >
                            {cat.name} - {formatRupiah(cat.default_amount)}
                          </button>
                        ))}
                    </>
                  ) : (
                    <span className="category-hint">Pilih Level / Kelas terlebih dahulu untuk melihat biaya cepat.</span>
                  )}
                </div>
              )}

              <div className="items-editor">
                {fields.map((field, index) => {
                  const itemAmount      = parseFloat(watchedItems[index]?.amount) || 0;
                  const discountType    = watchedItems[index]?.discount_type;
                  const discountValue   = parseFloat(watchedItems[index]?.discount_value) || 0;
                  let discountAmount    = 0;
                  if (discountType === 'percentage' && discountValue > 0) {
                    discountAmount = itemAmount * (discountValue / 100);
                  } else if (discountType === 'fixed' && discountValue > 0) {
                    discountAmount = Math.min(discountValue, itemAmount);
                  }
                  const finalAmount    = itemAmount - discountAmount;
                  const itemPayments   = watchedItems[index]?.payments || [];
                  const paidAmount     = itemPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                  const itemExpanded   = expandedItems[index];

                  return (
                    <div key={field.id} className="item-row-group">
                      <div className="item-row">
                        <div className="item-no">{index + 1}</div>
                        <div className="item-desc">
                          <input
                            className="form-input"
                            placeholder="Nama biaya (contoh: Registration Fee)"
                            onFocus={() => setActiveRowIndex(index)}
                            {...register(`items.${index}.description`, { required: true })}
                          />
                        </div>
                        <div className="item-amount">
                          <input
                            type="number"
                            className="form-input text-right"
                            placeholder="0"
                            min="0"
                            onFocus={() => setActiveRowIndex(index)}
                            {...register(`items.${index}.amount`, { min: 0 })}
                          />
                        </div>
                        <div className="item-status">
                          <select className="form-input" {...register(`items.${index}.status`)}>
                            <option>Belum Lunas</option>
                            <option>Sebagian</option>
                            <option>Lunas</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          className="item-expand"
                          onClick={() => toggleExpand(index)}
                          title="Diskon & Cicilan"
                        >
                          {itemExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                        <button
                          type="button"
                          className="item-remove"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Discount + Payments expanded section */}
                      {itemExpanded && (
                        <div className="item-expanded">
                          {/* Discount */}
                          <div className="item-expanded-row">
                            <label className="form-label-sm">Diskon</label>
                            <div className="discount-inputs">
                              <select
                                className="form-input form-input-sm"
                                {...register(`items.${index}.discount_type`)}
                              >
                                <option value="">Tanpa diskon</option>
                                <option value="percentage">Persentase (%)</option>
                                <option value="fixed">Nominal (Rp)</option>
                              </select>
                              {discountType && (
                                <input
                                  type="number"
                                  className="form-input form-input-sm"
                                  placeholder={discountType === 'percentage' ? '0-100' : '0'}
                                  min="0"
                                  max={discountType === 'percentage' ? 100 : undefined}
                                  {...register(`items.${index}.discount_value`, { min: 0 })}
                                />
                              )}
                              {discountAmount > 0 && (
                                <span className="discount-amount-display">
                                  -{formatRupiah(discountAmount)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Payments (Cicilan) */}
                          <div className="item-expanded-row">
                            <div className="payments-header">
                              <label className="form-label-sm">
                                <Wallet size={13} /> Cicilan
                              </label>
                              <span className="payment-progress">
                                {formatRupiah(paidAmount)} / {formatRupiah(finalAmount)}
                              </span>
                            </div>

                            {itemPayments.length > 0 && (
                              <div className="payments-list">
                                {itemPayments.map((payment, pi) => (
                                  <div key={pi} className="payment-row">
                                    <input
                                      type="date"
                                      className="form-input form-input-sm"
                                      {...register(`items.${index}.payments.${pi}.payment_date`)}
                                    />
                                    <input
                                      type="number"
                                      className="form-input form-input-sm"
                                      placeholder="Jumlah"
                                      min="0"
                                      {...register(`items.${index}.payments.${pi}.amount`, { min: 0 })}
                                    />
                                    <input
                                      className="form-input form-input-sm"
                                      placeholder="Catatan"
                                      {...register(`items.${index}.payments.${pi}.notes`)}
                                    />
                                    <button
                                      type="button"
                                      className="item-remove item-remove-sm"
                                      onClick={() => {
                                        const current = watchedItems[index]?.payments || [];
                                        const updated = current.filter((_, j) => j !== pi);
                                        setValue(`items.${index}.payments`, updated);
                                      }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => {
                                const current = watchedItems[index]?.payments || [];
                                setValue(`items.${index}.payments`, [...current, { ...defaultPayment }]);
                              }}
                            >
                              <Plus size={13} /> Tambah Cicilan
                            </button>
                          </div>

                          {/* Item summary */}
                          {discountAmount > 0 && (
                            <div className="item-summary-line">
                              <span>Harga awal: {formatRupiah(itemAmount)}</span>
                              <span className="text-red">Diskon: -{formatRupiah(discountAmount)}</span>
                              <span>Harga final: {formatRupiah(finalAmount)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="summary-card">
              {hasDiscountItems && (
                <>
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <strong>{formatRupiah(computed.totalBeforeDiscount)}</strong>
                  </div>
                  <div className="summary-row summary-row--discount">
                    <span>Total Diskon</span>
                    <strong className="text-red">-{formatRupiah(computed.totalDiscount)}</strong>
                  </div>
                </>
              )}
              <div className="summary-row summary-row--total">
                <span>Total Tagihan</span>
                <strong>{formatRupiah(computed.totalFinal)}</strong>
              </div>
              <div className="summary-row">
                <span>Bayaran Diterima</span>
                <strong className="text-green">{formatRupiah(computed.totalPaid)}</strong>
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
