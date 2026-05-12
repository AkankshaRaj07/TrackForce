import { LogOut, X, Shield, LayoutDashboard, Users, MapPin, Wallet, Building2, Settings, Calendar } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useTranslation();
  const isManager = user?.role === 'MANAGER' || isAdmin;

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: t('dashboard'), path: '/dashboard' },
    // Admins and Managers can see the employee list
    ...(isManager ? [{ icon: <Users size={20} />, label: t('employees'), path: '/employees' }] : []),
    
    { icon: <Calendar size={20} />, label: t('attendance'), path: '/attendance' },
    
    // Only Admins see Live Tracking (GPS)
    ...(isAdmin ? [{ icon: <MapPin size={20} />, label: t('tracking'), path: '/tracking' }] : []),
    
    // Payroll: Full for managers, "My Pay" for employees
    ...(isManager 
      ? [{ icon: <Wallet size={20} />, label: t('payroll'), path: '/payroll' }] 
      : [{ icon: <Wallet size={20} />, label: t('payroll'), path: '/payroll' }]),
    
    // Sites: Full for managers, "My Hub" for employees
    ...(isManager 
      ? [{ icon: <Building2 size={20} />, label: t('sites'), path: '/sites' }] 
      : [{ icon: <Building2 size={20} />, label: t('sites'), path: '/sites' }]),
      
    { icon: <Settings size={20} />, label: t('settings'), path: '/settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-section">
        <div className="logo-brand">
          <span className="logo-text">TrackForce</span>
        </div>
        <button className="mobile-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        <button onClick={logout} className="nav-item logout-btn-sidebar" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', padding: '12px 16px' }}>
          <LogOut size={20} />
          <span>{t('logout')}</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
