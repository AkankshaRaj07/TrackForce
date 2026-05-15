import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, AlertCircle, Languages, Eye, EyeOff } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; 
import { Sun, Moon } from 'lucide-react';
import { loginUser } from '../api/api';
import './Auth.css';

export const Login = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(nextLng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(employeeId, password);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page ${theme}`}>


      <div className="auth-container">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="auth-card-premium"
        >
          <div className="auth-card-toolbar">
            <button className="toolbar-btn" onClick={toggleTheme} title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="toolbar-btn lang-btn" onClick={toggleLanguage}>
              <Languages size={18} />
              <span>{i18n.language === 'en' ? 'VN' : 'EN'}</span>
            </button>
          </div>

          <div className="auth-header">
            <div className="logo-text" style={{ marginBottom: '8px' }}>TRACK<span>FORCE</span></div>
            <h2>{t('welcomeBack')}</h2>

            <p>{t('loginSubtext')}</p>
          </div>

          {error && (
            <div className="auth-error-premium">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group-premium">
              <label>{t('employeeID')}</label>
              <div className="input-wrapper-premium">
                <User size={20} />
                <input 
                  type="text" 
                  placeholder={i18n.language === 'en' ? "e.g. TF001" : "Vd: TF001"} 
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-premium">
              <label>{t('initialPassword')}</label>
              <div className="input-wrapper-premium">
                <Lock size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="auth-actions">
              <label className="checkbox-label">
                <input type="checkbox" /> {t('rememberMe')}
              </label>
              <a href="#" className="forgot-link">{t('forgotPassword')}</a>
            </div>

            <button className="btn btn-premium btn-primary-premium" disabled={loading}>
              {loading ? t('verifying') : t('dashboard')} <ArrowRight size={20} />
            </button>
          </form>

          <div className="auth-divider">
            <span>{t('orContinueWith')}</span>
          </div>

          <button className="btn btn-premium btn-ghost-premium btn-block">
            {t('enterpriseSSO')}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
