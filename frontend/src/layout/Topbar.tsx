import { 
  Search, 
  Bell, 
  User, 
  Sun, 
  Moon, 
  LogOut, 
  Menu, 
  Languages, 
  Settings as SettingsIcon,
  Shield,
  Database,
  Globe,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Topbar.css';

import { useAuth } from '../context/AuthContext';

const Topbar = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigateToSection = (sectionId: string) => {
    navigate('/settings');
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    setShowSettingsDropdown(false);
  };

  return (
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={onMenuClick}>
        <Menu size={24} />
      </button>
      <div className="topbar-spacer"></div>

      <div className="topbar-actions">
        <button className="action-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>

        {/* Settings Dropdown */}
        <div className="settings-dropdown-wrapper" ref={dropdownRef}>
          <button 
            className={`action-btn settings-btn ${showSettingsDropdown ? 'active' : ''}`} 
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
          >
            <SettingsIcon size={20} />
            <ChevronDown size={14} className={showSettingsDropdown ? 'rotate' : ''} />
          </button>

          {showSettingsDropdown && (
            <div className="premium-dropdown">
              <div className="dropdown-header">System Settings</div>
              <button className="dropdown-item" onClick={() => navigateToSection('profile')}>
                <User size={16} /> <span>Profile Settings</span>
              </button>
              <button className="dropdown-item" onClick={() => navigateToSection('notifications')}>
                <Bell size={16} /> <span>Notifications</span>
              </button>
              <button className="dropdown-item" onClick={() => navigateToSection('security')}>
                <Shield size={16} /> <span>Security & Privacy</span>
              </button>
              <button className="dropdown-item" onClick={() => navigateToSection('data')}>
                <Database size={16} /> <span>Data Management</span>
              </button>
              <button className="dropdown-item" onClick={() => navigateToSection('appearance')}>
                <Globe size={16} /> <span>Site Configuration</span>
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <LogOut size={16} /> <span>Logout Session</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{user ? `${user.firstName} ${user.lastName}` : 'Guest'}</span>
            <span className="user-role-badge">{user?.role || 'Guest'}</span>
          </div>
          <div className="avatar-wrapper-top">
            {user?.avatar ? <img src={user.avatar} alt="Avatar" /> : <User size={18} />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
