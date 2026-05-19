import { 
  Sun, 
  Moon, 
  Menu, 
  Globe,
  Bell,
  HelpCircle
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Topbar.css';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Topbar = ({ onMenuClick, hideMenuBtn = false }: { onMenuClick?: () => void; hideMenuBtn?: boolean }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {!hideMenuBtn && (
          <button className="mobile-menu-btn" onClick={onMenuClick}>
            <Menu size={24} />
          </button>
        )}
        
        <div className="topbar-spacer"></div>

        <div className="topbar-actions">
          <button className="icon-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className="icon-btn">
            <Bell size={20} />
            <span className="notification-dot"></span>
          </button>

          <button className="icon-btn">
            <HelpCircle size={20} />
          </button>

          <div className="lang-dropdown-wrapper" ref={langRef}>
            <button 
              className={`icon-btn ${showLangDropdown ? 'active' : ''}`} 
              onClick={() => setShowLangDropdown(!showLangDropdown)}
            >
              <Globe size={20} />
            </button>

            {showLangDropdown && (
              <div className="premium-dropdown lang-dropdown">
                <button 
                  className={`dropdown-item ${i18n.language === 'en' ? 'active' : ''}`} 
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
          
          <div className="user-profile-mini">
            <img 
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName}`} 
              alt="User" 
              className="user-avatar-mini"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
