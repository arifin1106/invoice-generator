import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingApi, paymentCategoryApi, bankAccountApi } from '../services/api';
import { LEVELS, BANK_CATEGORIES } from '../utils/constants';
import CurrencyInput from '../components/CurrencyInput';
import { Save, Building2, CreditCard, PenLine, Coins, Plus, Pencil, Trash2, X } from 'lucide-react';

export default function Settings() {
  const qc = useQueryClient();
  const [toast, setToast] = useState(null);

  const { data: setting, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingApi.show().then((r) => r.data),
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['payment-categories'],
    queryFn: () => paymentCategoryApi.list().then((r) => r.data),
  });

  const [form, setForm] = useState({
    institution_name: '', institution_address: '', institution_phone: '',
    institution_email: '', signer_name: '', signer_title: '',
    payment_message: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [sigFile, setSigFile] = useState(null);
  const [catAmounts, setCatAmounts] = useState({});

  const { data: banks = [], isLoading: loadingBanks } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => bankAccountApi.list().then((r) => r.data),
  });

  const [bankModal, setBankModal] = useState(null);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_name: '', category: 'umum' });
  const [bankDeleteId, setBankDeleteId] = useState(null);

  const groupedCategories = useMemo(() => {
    if (!categories) return [];
    const map = new Map();
    categories.forEach((cat) => {
      if (!map.has(cat.name)) map.set(cat.name, []);
      map.get(cat.name).push(cat);
    });
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [categories]);

  useEffect(() => {
    if (setting) {
      setForm({
        institution_name:    setting.institution_name    ?? '',
        institution_address: setting.institution_address ?? '',
        institution_phone:   setting.institution_phone   ?? '',
        institution_email:   setting.institution_email   ?? '',
        signer_name:         setting.signer_name         ?? '',
        signer_title:        setting.signer_title        ?? '',
        payment_message:     setting.payment_message     ?? '',
      });
    }
  }, [setting]);

  useEffect(() => {
    if (categories) {
      const amounts = {};
      categories.forEach((cat) => {
        amounts[cat.id] = cat.default_amount;
      });
      setCatAmounts(amounts);
    }
  }, [categories]);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append('institution_logo', logoFile);
      if (sigFile)  fd.append('signer_signature', sigFile);
      return settingApi.update(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries(['settings']);
      showToast('Pengaturan berhasil disimpan!', 'success');
    },
    onError: () => showToast('Gagal menyimpan pengaturan.', 'error'),
  });

  const categoryMutation = useMutation({
    mutationFn: (data) => paymentCategoryApi.update(data),
    onSuccess: (res) => {
      qc.setQueryData(['payment-categories'], res.data);
      showToast('Biaya default berhasil disimpan!', 'success');
    },
    onError: () => showToast('Gagal menyimpan biaya default.', 'error'),
  });

  const bankMutation = useMutation({
    mutationFn: (data) =>
      bankModal?.id
        ? bankAccountApi.update(bankModal.id, data)
        : bankAccountApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['bank-accounts']);
      setBankModal(null);
      setBankForm({ bank_name: '', account_number: '', account_name: '', category: 'umum' });
      showToast('Rekening bank berhasil disimpan!', 'success');
    },
    onError: () => showToast('Gagal menyimpan rekening bank.', 'error'),
  });

  const bankDeleteMutation = useMutation({
    mutationFn: (id) => bankAccountApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['bank-accounts']);
      setBankDeleteId(null);
      showToast('Rekening bank berhasil dihapus!', 'success');
    },
    onError: () => showToast('Gagal menghapus rekening bank.', 'error'),
  });

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleOpenBankModal = (bank = null) => {
    setBankModal(bank ?? false);
    setBankForm(bank
      ? { bank_name: bank.bank_name, account_number: bank.account_number, account_name: bank.account_name, category: bank.category }
      : { bank_name: '', account_number: '', account_name: '', category: 'umum' });
  };

  const handleCategoryAmountChange = (id, value) => {
    setCatAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveCategories = () => {
    const data = {
      categories: Object.entries(catAmounts).map(([id, default_amount]) => ({
        id: parseInt(id),
        default_amount: parseFloat(default_amount) || 0,
      })),
    };
    categoryMutation.mutate(data);
  };

  if (isLoading) return <div className="page"><div className="table-empty"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-subtitle">Konfigurasi data instansi, rekening bank, dan biaya default</p>
        </div>
        <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <Save size={16} />
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      <div className="form-grid-2">
        {/* Institusi */}
        <div className="form-section">
          <div className="section-header">
            <Building2 size={18} className="section-icon" />
            <h2 className="section-title">Informasi Instansi</h2>
          </div>

          <div className="form-group">
            <label className="form-label">Nama Instansi</label>
            <input name="institution_name" className="form-input" value={form.institution_name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Alamat</label>
            <textarea name="institution_address" className="form-input form-textarea" rows={3} value={form.institution_address} onChange={handleChange} />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Telepon</label>
              <input name="institution_phone" className="form-input" value={form.institution_phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="institution_email" type="email" className="form-input" value={form.institution_email} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Logo Instansi</label>
            <div className="file-upload">
              {setting?.logo_url && (
                <img src={setting.logo_url} alt="Logo" className="preview-img" />
              )}
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="form-input" />
            </div>
          </div>
        </div>

        <div>
          {/* Bank Accounts per Kategori */}
          <div className="form-section mb-4">
            <div className="section-header">
              <CreditCard size={18} className="section-icon" />
              <h2 className="section-title">Rekening Bank per Kategori</h2>
            </div>
            <p className="section-desc">Atur rekening bank untuk setiap kategori. Saat membuat invoice, rekening akan otomatis dipilih sesuai kategori level siswa, dan dapat diubah manual di form invoice.</p>

            {loadingBanks ? (
              <div className="spinner" />
            ) : banks.length === 0 ? (
              <div className="table-empty">
                <CreditCard size={40} className="empty-icon" />
                <p>Belum ada rekening bank.</p>
              </div>
            ) : (
              <div className="table-card table-card--flush">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th>Nama Bank</th>
                      <th>No. Rekening</th>
                      <th>Atas Nama</th>
                      <th className="text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banks.map((bank) => (
                      <tr key={bank.id}>
                        <td data-label="Kategori">{BANK_CATEGORIES.find((c) => c.value === bank.category)?.label ?? bank.category}</td>
                        <td data-label="Bank">{bank.bank_name}</td>
                        <td data-label="No. Rekening"><strong>{bank.account_number}</strong></td>
                        <td data-label="Atas Nama">{bank.account_name}</td>
                        <td className="text-center" data-label="Aksi">
                          <div className="action-btns">
                            <button className="action-btn action-btn--edit" title="Edit" onClick={() => handleOpenBankModal(bank)}><Pencil size={15} /></button>
                            <button className="action-btn action-btn--delete" title="Hapus" onClick={() => setBankDeleteId(bank.id)}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3">
              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenBankModal()}>
                <Plus size={14} />
                Tambah Rekening
              </button>
            </div>
          </div>

          {/* Signature */}
          <div className="form-section mb-4">
            <div className="section-header">
              <PenLine size={18} className="section-icon" />
              <h2 className="section-title">Tanda Tangan</h2>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Nama Penandatangan</label>
                <input name="signer_name" className="form-input" value={form.signer_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Jabatan</label>
                <input name="signer_title" className="form-input" value={form.signer_title} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">File Tanda Tangan</label>
              <div className="file-upload">
                {setting?.signature_url && (
                  <img src={setting.signature_url} alt="TTD" className="preview-img preview-img--sig" />
                )}
                <input type="file" accept="image/*" onChange={(e) => setSigFile(e.target.files[0])} className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pesan Konfirmasi Pembayaran</label>
              <textarea name="payment_message" className="form-input form-textarea" rows={4} value={form.payment_message} onChange={handleChange} />
            </div>
          </div>

          {/* Payment Categories / Biaya Default */}
          <div className="form-section">
            <div className="section-header">
              <Coins size={18} className="section-icon" />
              <h2 className="section-title">Biaya Default</h2>
            </div>
            <p className="section-desc">Atur harga default setiap kategori biaya per tingkat kelas. Harga ini akan muncul sebagai opsi quick-add saat membuat invoice baru sesuai level siswa.</p>

            {loadingCategories ? (
              <div className="spinner" />
            ) : (
              <>
                <div className="category-matrix">
                  <div className="category-matrix-header">
                    <span className="cat-mx-name">Kategori</span>
                    {LEVELS.map((level) => (
                      <span key={level} className="cat-mx-level">{level}</span>
                    ))}
                  </div>
                  {groupedCategories.map((group) => (
                    <div key={group.name} className="category-matrix-row">
                      <span className="cat-mx-name">{group.name}</span>
                      {LEVELS.map((level) => {
                        const cat = group.items.find((c) => c.student_level === level);
                        if (!cat) return <div key={level} className="cat-mx-cell" />;
                        return (
                          <div key={level} className="cat-mx-cell">
                            <div className="input-group input-group--compact">
                              <span className="input-prefix">Rp</span>
                              <CurrencyInput
                                className="form-input text-right"
                                value={catAmounts[cat.id]}
                                onValueChange={(v) => handleCategoryAmountChange(cat.id, v)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleSaveCategories}
                    disabled={categoryMutation.isPending}
                  >
                    <Save size={14} />
                    {categoryMutation.isPending ? 'Menyimpan...' : 'Simpan Biaya Default'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {bankModal !== null && (
        <div className="modal-overlay show" onClick={() => setBankModal(null)}>
          <div className="modal bank-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {bankModal?.id ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
              </h3>
              <button className="btn-icon" onClick={() => setBankModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select
                  className="form-input"
                  value={bankForm.category}
                  onChange={(e) => setBankForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {BANK_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nama Bank</label>
                <input className="form-input" value={bankForm.bank_name} onChange={(e) => setBankForm((f) => ({ ...f, bank_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Nomor Rekening</label>
                <input className="form-input" value={bankForm.account_number} onChange={(e) => setBankForm((f) => ({ ...f, account_number: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Atas Nama</label>
                <input className="form-input" value={bankForm.account_name} onChange={(e) => setBankForm((f) => ({ ...f, account_name: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setBankModal(null)}>Batal</button>
              <button
                className="btn btn-primary"
                onClick={() => bankMutation.mutate(bankForm)}
                disabled={bankMutation.isPending}
              >
                {bankMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bankDeleteId && (
        <div className="modal-overlay show" onClick={() => setBankDeleteId(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <h3 className="modal-title">Hapus rekening bank?</h3>
              <p className="modal-desc">Rekening ini tidak akan lagi digunakan pada invoice baru. Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setBankDeleteId(null)}>Batal</button>
              <button
                className="btn btn-danger"
                onClick={() => bankDeleteMutation.mutate(bankDeleteId)}
                disabled={bankDeleteMutation.isPending}
              >
                {bankDeleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
