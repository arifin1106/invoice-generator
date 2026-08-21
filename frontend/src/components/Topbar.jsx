import { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ onOpenProfile, onMenuClick }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A';

  return (
    <header className="topbar">
      {onMenuClick && (
        <button
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Buka menu navigasi"
        >
          <Menu size={20} />
        </button>
      )}
      <div className="topbar-spacer" />

      <div className="topbar-right" ref={ref}>
        <button className="topbar-profile-btn" onClick={() => setOpen(!open)}>
          {user?.profile_photo_url ? (
            <img
              src={user.profile_photo_url}
              alt="Profil"
              className="topbar-avatar-img"
            />
          ) : (
            <div className="topbar-avatar-initials">{initials}</div>
          )}
          <div className="topbar-user-info">
            <span className="topbar-user-name">{user?.name || 'Admin'}</span>
          </div>
          <ChevronDown size={14} className={`topbar-chevron ${open ? 'topbar-chevron--open' : ''}`} />
        </button>

        {open && (
          <div className="topbar-dropdown">
            <div className="topbar-dropdown-header">
              <p className="topbar-dropdown-name">{user?.name}</p>
              <p className="topbar-dropdown-email">{user?.email}</p>
            </div>
            <div className="topbar-dropdown-divider" />
            <button
              className="topbar-dropdown-item"
              onClick={() => { setOpen(false); onOpenProfile(); }}
            >
              <Settings size={15} />
              <span>Pengaturan Profil</span>
            </button>
            <div className="topbar-dropdown-divider" />
            <button className="topbar-dropdown-item topbar-dropdown-item--danger" onClick={logout}>
              <LogOut size={15} />
              <span>Keluar</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
