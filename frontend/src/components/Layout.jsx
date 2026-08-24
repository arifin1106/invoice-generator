import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  PlusCircle,
  GraduationCap,
  Menu,
  Receipt,
  X,
} from 'lucide-react';
import Topbar from './Topbar';
import ProfileModal from './ProfileModal';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Invoice' },
  { to: '/receipts',  icon: Receipt,         label: 'Kwitansi' },
  { to: '/settings',  icon: Settings,        label: 'Pengaturan' },
];

export default function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className={`app-shell ${isCollapsed ? 'app-shell--collapsed' : ''}`}>
      {/* Sidebar */}
      <aside
        className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${drawerOpen ? 'sidebar--open' : ''}`}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-info">
            <div className="brand-icon">
              <img src="/logo.png" alt="JACOS Logo" style={{ width: '50px', height: 'auto', objectFit: 'contain' }} />
            </div>
            <div className="brand-text">
              <span className="brand-title">JACOS</span>
              <span className="brand-sub">Invoice System</span>
            </div>
          </div>
          <button
            className="sidebar-toggle btn-ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label="Ciutkan sidebar"
          >
            <Menu size={20} />
          </button>
          <button
            className="sidebar-close btn-ghost"
            onClick={() => setDrawerOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Quick Action */}
        <div className="sidebar-footer">
          <NavLink to="/invoices/new" className="btn btn-primary btn-full">
            <PlusCircle size={16} />
            <span>Buat Invoice</span>
          </NavLink>
        </div>
      </aside>

      {/* Drawer Backdrop */}
      {drawerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main */}
      <main className="main-content">
        <Topbar
          onOpenProfile={() => setProfileOpen(true)}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <Outlet />
      </main>

      {/* Profile Modal */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
