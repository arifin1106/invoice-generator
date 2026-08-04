import { useState, useRef } from 'react';
import { X, Camera, Trash2, Loader2, Eye, EyeOff, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function ProfileModal({ onClose }) {
  const { user, token, login } = useAuth();

  // Local state for forms
  const [name, setName]   = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [infoMsg, setInfoMsg]   = useState('');
  const [infoType, setInfoType] = useState('success'); // 'success' | 'error'
  const [loading, setLoading]   = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const fileRef = useRef(null);

  // Shared state via AuthContext refresh
  const [localUser, setLocalUser] = useState(user);

  const headers = { Authorization: `Bearer ${token}` };

  const showFeedback = (msg, type = 'success') => {
    setInfoMsg(msg);
    setInfoType(type);
    setTimeout(() => setInfoMsg(''), 3500);
  };

  /* ── Update name & email ──────────────────────── */
  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.put(`${apiBase}/profile`, { name, email }, { headers });
      setLocalUser(res.data.user);
      showFeedback('Informasi profil berhasil disimpan.');
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Gagal menyimpan profil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Update password ──────────────────────────── */
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showFeedback('Konfirmasi password tidak cocok.', 'error');
      return;
    }
    setLoading(true);
    try {
      await axios.put(`${apiBase}/profile`, {
        current_password:      currentPassword,
        new_password:          newPassword,
        new_password_confirmation: confirmPassword,
      }, { headers });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showFeedback('Password berhasil diubah.');
    } catch (err) {
      const msg = err.response?.data?.errors?.current_password?.[0]
        || err.response?.data?.message
        || 'Gagal mengubah password.';
      showFeedback(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Upload photo ─────────────────────────────── */
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await axios.post(`${apiBase}/profile/photo`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      setLocalUser(res.data.user);
      showFeedback('Foto profil berhasil diupload.');
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Gagal upload foto.', 'error');
    } finally {
      setPhotoLoading(false);
    }
  };

  /* ── Delete photo ─────────────────────────────── */
  const handleDeletePhoto = async () => {
    setPhotoLoading(true);
    try {
      const res = await axios.delete(`${apiBase}/profile/photo`, { headers });
      setLocalUser(res.data.user);
      showFeedback('Foto profil berhasil dihapus.');
    } catch (err) {
      showFeedback('Gagal menghapus foto.', 'error');
    } finally {
      setPhotoLoading(false);
    }
  };

  const initials = localUser?.name
    ? localUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--profile" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Pengaturan Profil</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Feedback */}
        {infoMsg && (
          <div className={`profile-feedback profile-feedback--${infoType}`}>
            {infoMsg}
          </div>
        )}

        <div className="profile-modal-body">

          {/* ── Foto Profil ─────────────────────────── */}
          <section className="profile-section">
            <h3 className="profile-section-title">Foto Profil</h3>
            <div className="profile-photo-area">
              <div className="profile-photo-preview">
                {localUser?.profile_photo_url ? (
                  <img src={localUser.profile_photo_url} alt="Foto profil" className="profile-photo-img" />
                ) : (
                  <div className="profile-photo-initials">{initials}</div>
                )}
                {photoLoading && (
                  <div className="profile-photo-loading">
                    <Loader2 size={24} className="spin-icon" />
                  </div>
                )}
              </div>
              <div className="profile-photo-actions">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={photoLoading}>
                  <Camera size={15} />
                  <span>Upload Foto</span>
                </button>
                {localUser?.profile_photo_url && (
                  <button className="btn btn-danger-ghost btn-sm" onClick={handleDeletePhoto} disabled={photoLoading}>
                    <Trash2 size={15} />
                    <span>Hapus Foto</span>
                  </button>
                )}
                <p className="profile-photo-hint">Format: JPG, PNG, GIF, WEBP. Maks 2 MB.</p>
              </div>
            </div>
          </section>

          {/* ── Informasi Akun ──────────────────────── */}
          <section className="profile-section">
            <h3 className="profile-section-title">Informasi Akun</h3>
            <form onSubmit={handleUpdateInfo}>
              <div className="form-group">
                <label className="form-label">Nama</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                {loading ? <Loader2 size={15} className="spin-icon" /> : <Save size={15} />}
                <span>Simpan Informasi</span>
              </button>
            </form>
          </section>

          {/* ── Ubah Password ───────────────────────── */}
          <section className="profile-section">
            <h3 className="profile-section-title">Ubah Password</h3>
            <form onSubmit={handleUpdatePassword}>
              <div className="form-group">
                <label className="form-label">Password Saat Ini</label>
                <div className="input-password-wrap">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="form-input"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="input-eye" onClick={() => setShowCurrent(!showCurrent)}>
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <div className="input-password-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="form-input"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="input-eye" onClick={() => setShowNew(!showNew)}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Konfirmasi Password Baru</label>
                <div className="input-password-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="input-eye" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                {loading ? <Loader2 size={15} className="spin-icon" /> : <Save size={15} />}
                <span>Ubah Password</span>
              </button>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}
