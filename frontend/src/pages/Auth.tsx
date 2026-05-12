import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, Shield, AlertCircle, Languages } from 'lucide-react';
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
      <div className="lang-toggle-auth">
        <button className="lang-btn-auth" onClick={toggleTheme} style={{ marginRight: '10px' }}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="lang-btn-auth" onClick={toggleLanguage}>
          <Languages size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {i18n.language === 'en' ? 'Tiếng Việt' : 'English'}
        </button>
      </div>

      <div className="auth-container">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="auth-card-premium"
        >
          <div className="auth-header">
            <div className="auth-logo">
              <h2 style={{ fontSize: '24px', margin: 0 }}>TrackForce</h2>
            </div>
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
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
