import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react';

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
      setError(err.response?.data?.message || 'Login gagal. Silakan periksa kembali email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="JCoS Logo" style={{ width: '80px', height: 'auto', objectFit: 'contain', marginBottom: '1rem' }} />
          <h1 className="login-title">JCoS Invoice</h1>
          <p className="login-subtitle">Silakan login untuk mengakses sistem</p>
        </div>

        {error && <div className="toast toast--error mb-4" style={{ position: 'relative', top: 0, right: 0 }}>{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="example@mail.com"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-password-wrap">
              <input 
                type={showPassword ? 'text' : 'password'}
                className="form-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                placeholder="••••••••"
              />
              <button
                type="button"
                className="input-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin-icon" /> : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
