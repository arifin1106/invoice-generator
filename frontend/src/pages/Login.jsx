import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

function getLoginErrorMessage(err) {
  // Pesan dari backend (termasuk lockout 5x gagal) tetap diprioritaskan
  const serverMessage = err.response?.data?.message;
  if (serverMessage) return serverMessage;

  if (!err.response) {
    return 'Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.';
  }
  if (err.response.status === 429) {
    return 'Terlalu banyak percobaan masuk. Tunggu beberapa menit, lalu coba lagi.';
  }
  return 'Email atau password salah. Periksa lagi, lalu coba masuk.';
}

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const hasError = Boolean(error);

  return (
    <main className="auth-page">
      <div className="auth-stack">
        {/* Dua map di belakang: Invoice & Kwitansi (dekoratif) */}
        <div className="auth-sheet auth-sheet--receipt" aria-hidden="true">
          <span className="auth-sheet-tab">Kwitansi</span>
        </div>
        <div className="auth-sheet auth-sheet--invoice" aria-hidden="true">
          <span className="auth-sheet-tab">Invoice</span>
        </div>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-tab">
            <img src="/logo.png" alt="" className="auth-tab-logo" />
            JACOS Invoice
          </div>

          <h1 id="auth-title" className="auth-title">Masuk</h1>
          <p className="auth-subtitle">Gunakan email dan password akun Anda.</p>

          {hasError && (
            <div id="auth-error" className="auth-alert" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (hasError) setError(''); }}
                required
                autoComplete="username"
                autoFocus
                placeholder="nama@email.com"
                aria-invalid={hasError}
                aria-describedby={hasError ? 'auth-error' : undefined}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (hasError) setError(''); }}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  aria-invalid={hasError}
                  aria-describedby={hasError ? 'auth-error' : undefined}
                />
                <button
                  type="button"
                  className="input-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin-icon" aria-hidden="true" />
                  Memproses…
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}