import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  PlusCircle,
  Menu,
  Receipt,
  X,
  FileText,
  ChevronDown,
} from 'lucide-react';
import Topbar from './Topbar';
import ProfileModal from './ProfileModal';

const navGroups = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    icon: FileText,
    label: 'Invoice',
    children: [
      { to: '/invoices/preschool', label: 'Preschool & Kindergarten' },
      { to: '/invoices/primary',   label: 'Primary' },
    ],
  },
  { to: '/receipts',  icon: Receipt,  label: 'Kwitansi' },
  { to: '/settings',  icon: Settings, label: 'Pengaturan' },
];

export default function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => {
    if (location.pathname.startsWith('/invoices/preschool') || location.pathname.startsWith('/invoices/primary')) {
      return { Invoice: true };
    }
    return {};
  });

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/invoices/preschool') || location.pathname.startsWith('/invoices/primary')) {
      setOpenGroups((prev) => ({ ...prev, Invoice: true }));
    }
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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
          {navGroups.map((item) => {
            if (item.children) {
              const isOpen = !!openGroups[item.label];
              const isChildActive = item.children.some((c) => location.pathname.startsWith(c.to));
              return (
                <div key={item.label} className="nav-group">
                  <button
                    className={`nav-item nav-item--group ${isChildActive ? 'nav-item--active' : ''}`}
                    onClick={() => toggleGroup(item.label)}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    <ChevronDown size={14} className={`nav-chevron ${isOpen ? 'nav-chevron--open' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="nav-children">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            `nav-item nav-item--child ${isActive ? 'nav-item--active' : ''}`
                          }
                        >
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item--active' : ''}`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
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
