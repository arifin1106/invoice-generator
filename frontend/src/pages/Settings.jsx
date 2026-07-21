import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingApi } from '../services/api';
import { Save, Building2, CreditCard, PenLine } from 'lucide-react';

export default function Settings() {
  const qc = useQueryClient();
  const [toast, setToast] = useState(null);

  const { data: setting, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingApi.show().then((r) => r.data),
  });

  const [form, setForm] = useState({
    institution_name: '', institution_address: '', institution_phone: '',
    institution_email: '', bank_name: '', bank_account_number: '',
    bank_account_name: '', signer_name: '', signer_title: '',
    payment_message: '',
  });
  const [logoFile, setLogoFile]   = useState(null);
  const [sigFile,  setSigFile]    = useState(null);

  useEffect(() => {
    if (setting) {
      setForm({
        institution_name:    setting.institution_name    ?? '',
        institution_address: setting.institution_address ?? '',
        institution_phone:   setting.institution_phone   ?? '',
        institution_email:   setting.institution_email   ?? '',
        bank_name:           setting.bank_name           ?? '',
        bank_account_number: setting.bank_account_number ?? '',
        bank_account_name:   setting.bank_account_name   ?? '',
        signer_name:         setting.signer_name         ?? '',
        signer_title:        setting.signer_title        ?? '',
        payment_message:     setting.payment_message     ?? '',
      });
    }
  }, [setting]);

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

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  if (isLoading) return <div className="page"><div className="table-empty"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-subtitle">Konfigurasi data instansi dan rekening bank</p>
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
                <img
                  src={setting.logo_url}
                  alt="Logo"
                  className="preview-img"
                />
              )}
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="form-input" />
            </div>
          </div>
        </div>

        <div>
          {/* Bank */}
          <div className="form-section mb-4">
            <div className="section-header">
              <CreditCard size={18} className="section-icon" />
              <h2 className="section-title">Detail Pembayaran</h2>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Bank</label>
              <input name="bank_name" className="form-input" value={form.bank_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor Rekening</label>
              <input name="bank_account_number" className="form-input" value={form.bank_account_number} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Atas Nama</label>
              <input name="bank_account_name" className="form-input" value={form.bank_account_name} onChange={handleChange} />
            </div>
          </div>

          {/* Signature */}
          <div className="form-section">
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
                  <img
                    src={setting.signature_url}
                    alt="TTD"
                    className="preview-img preview-img--sig"
                  />
                )}
                <input type="file" accept="image/*" onChange={(e) => setSigFile(e.target.files[0])} className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pesan Konfirmasi Pembayaran</label>
              <textarea name="payment_message" className="form-input form-textarea" rows={4} value={form.payment_message} onChange={handleChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
