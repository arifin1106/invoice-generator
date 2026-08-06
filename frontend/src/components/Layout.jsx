import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  PlusCircle,
  GraduationCap,
  Menu,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
          <NavLink to="/invoices/new" className="btn btn-primary btn-full">
            <PlusCircle size={16} />
            <span>Buat Invoice</span>
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Topbar onOpenProfile={() => setProfileOpen(true)} />
        <Outlet />
      </main>

      {/* Profile Modal */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
