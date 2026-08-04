import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  PlusCircle,
  GraduationCap,
  Menu,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/settings',  icon: Settings,         label: 'Pengaturan' },
];

export default function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout } = useAuth();

  return (
    <div className={`app-shell ${isCollapsed ? 'app-shell--collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-info">
            <div className="brand-icon">
              <GraduationCap size={22} />
            </div>
            <div className="brand-text">
              <span className="brand-title">JCoS</span>
              <span className="brand-sub">Invoice System</span>
            </div>
          </div>
          <button className="sidebar-toggle btn-ghost" onClick={() => setIsCollapsed(!isCollapsed)}>
            <Menu size={20} />
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
          <NavLink to="/invoices/new" className="btn btn-primary btn-full mb-3">
            <PlusCircle size={16} />
            <span>Buat Invoice</span>
          </NavLink>
          <button onClick={logout} className="btn btn-ghost btn-full" style={{ color: 'var(--red)' }}>
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
