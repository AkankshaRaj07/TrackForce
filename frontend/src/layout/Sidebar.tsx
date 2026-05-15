import { 
  LogOut, 
  X, 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Wallet, 
  Building2, 
  Settings, 
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar = ({ onClose, collapsed, onToggleCollapse }: SidebarProps) => {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useTranslation();
  const isManager = user?.role === 'MANAGER' || isAdmin;

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: t('dashboard'), path: '/dashboard' },
    ...(isManager ? [{ icon: <Users size={20} />, label: t('employees'), path: '/employees' }] : []),
    { icon: <Calendar size={20} />, label: t('attendance'), path: '/attendance' },
    ...(isAdmin ? [{ icon: <MapPin size={20} />, label: t('tracking'), path: '/tracking' }] : []),
    { icon: <Wallet size={20} />, label: t('payroll'), path: '/payroll' },
    { icon: <Building2 size={20} />, label: t('sites'), path: '/sites' },
    { icon: <Settings size={20} />, label: t('settings'), path: '/settings' },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon-box">
            <Building2 size={24} className="logo-icon-svg" />
          </div>
          {!collapsed && (
            <div className="logo-text-group">
              <span className="logo-main">TrackForce</span>
              <span className="logo-sub">Workforce Intel</span>
            </div>
          )}
        </div>
        
        {!collapsed && (
          <button className="mobile-close-btn mobile-only" onClick={onClose}>
            <X size={24} />
          </button>
        )}

        <button className="collapse-toggle-btn desktop-only" onClick={onToggleCollapse}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="nav-menu">
        {!collapsed && <div className="nav-section-label">Main Menu</div>}
        {menuItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => window.innerWidth < 1024 && onClose?.()}
            title={collapsed ? item.label : ''}
          >
            <div className="nav-icon-wrapper">
              {item.icon}
            </div>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="pulse-card">
            <div className="pulse-header">
              <span className="pulse-label">Daily Pulse</span>
              <div className="pulse-dot"></div>
            </div>
            <div className="pulse-stats">
              <div className="pulse-stat">
                <span className="pulse-value">24</span>
                <span className="pulse-desc">Present</span>
              </div>
              <div className="pulse-stat">
                <span className="pulse-value accent">2</span>
                <span className="pulse-desc">Absent</span>
              </div>
            </div>
            <div className="pulse-progress-bg">
              <div className="pulse-progress-fill" style={{ width: '92%' }}></div>
            </div>
          </div>
        )}
        
        <button onClick={logout} className="logout-btn-sidebar">
          <LogOut size={18} />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
