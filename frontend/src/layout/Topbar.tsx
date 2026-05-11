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
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
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
        <button className="action-btn" onClick={toggleTheme} title="Toggle Appearance">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="lang-dropdown-wrapper" ref={langRef}>
          <button 
            className={`action-btn ${showLangDropdown ? 'active' : ''}`} 
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            title="Change Language"
          >
            <Globe size={20} />
          </button>

          {showLangDropdown && (
            <div className="premium-dropdown lang-dropdown">
              <button 
                className={`dropdown-item ${i18n.language === 'en' ? 'active' : ''}`} 
                onChange={() => i18n.changeLanguage('en')}
                onClick={() => { i18n.changeLanguage('en'); setShowLangDropdown(false); }}
              >
                <span>English (UK)</span>
              </button>
              <button 
                className={`dropdown-item ${i18n.language === 'vi' ? 'active' : ''}`} 
                onClick={() => { i18n.changeLanguage('vi'); setShowLangDropdown(false); }}
              >
                <span>Vietnamese (VN)</span>
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
