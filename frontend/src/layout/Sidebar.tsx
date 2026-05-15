import { X, LayoutDashboard, Users, MapPin, Wallet, Building2, Settings, Calendar, HelpCircle, Sun, Moon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isManager = user?.role === 'MANAGER' || isAdmin;

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: t('dashboard').toUpperCase(), path: '/dashboard' },
    ...(isManager ? [{ icon: <Users size={20} />, label: t('employees').toUpperCase(), path: '/employees' }] : []),
    { icon: <Calendar size={20} />, label: t('attendance').toUpperCase(), path: '/attendance' },
    ...(isAdmin ? [{ icon: <MapPin size={20} />, label: t('tracking').toUpperCase(), path: '/tracking' }] : []),
    { icon: <Wallet size={20} />, label: t('payroll').toUpperCase(), path: '/payroll' },
    { icon: <Building2 size={20} />, label: t('sites').toUpperCase(), path: '/sites' },
    { icon: <Settings size={20} />, label: t('settings').toUpperCase(), path: '/settings' },
  ];

  return (
    <aside className="sidebar-premium">
      <div className="sidebar-header-elite">
        <h2>{t('navigation', 'Navigation')}</h2>
        <button className="close-btn-round" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <nav className="nav-menu-premium">
        <div className="menu-items-group">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path}
              className={({ isActive }) => `nav-link-premium ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
        
        <div className="sidebar-footer-premium">
          <div className="theme-toggle-section">
            <span className="toggle-label">{t('darkMode', 'Dark Mode')}</span>
            <button className={`theme-switch-elite ${theme}`} onClick={toggleTheme}>
              <div className="switch-thumb">
                {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
              </div>
            </button>
          </div>

          <button className="btn-sidebar-primary">
            <HelpCircle size={18} />
            <span>CONTACT SUPPORT</span>
          </button>

          <button onClick={logout} className="logout-btn-premium">
            {t('logout').toUpperCase()}
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
