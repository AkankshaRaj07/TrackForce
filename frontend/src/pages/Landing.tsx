import { motion } from 'framer-motion';
import { Shield, MapPin, ArrowRight, Languages, Lock, Globe, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext'; 
import { Sun, Moon } from 'lucide-react';
import './Landing.css';

const Landing = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(nextLng);
  };

  return (
    <div className={`landing-page ${theme}`}>
      <nav className="landing-nav">
        <div className="logo-text">TRACK<span>FORCE</span></div>
        <div className="nav-links">
          <button className="btn btn-ghost" onClick={toggleTheme} style={{ padding: '8px' }}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="btn btn-ghost" onClick={toggleLanguage} style={{ fontSize: '14px' }}>
            <Languages size={16} style={{ marginRight: '8px' }} />
            {i18n.language === 'en' ? 'Tiếng Việt' : 'English'}
          </button>
          <Link to="/login" className="btn btn-ghost">Login</Link>
          <Link to="/login" className="btn btn-primary" style={{ borderRadius: '10px' }}>{t('startTrial')}</Link>
        </div>
      </nav>

      <header className="hero-section">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-content"
        >
          <div className="hero-badge">{t('trustedBy')}</div>
          <h1>{t('heroTitle').split(' ').slice(0, 3).join(' ')} <span>{t('heroTitle').split(' ').slice(3).join(' ')}</span></h1>
          <p>{t('heroSubtext')}</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '18px', borderRadius: '12px' }}>
              {t('startTrial')} <ArrowRight size={20} style={{ marginLeft: '12px' }} />
            </Link>
          </div>
        </motion.div>
      </header>

      <section className="features-section">
        <div className="grid-container">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="feature-card-premium w-66"
          >
            <h3>{t('biometricIdentity')}</h3>
            <p style={{ maxWidth: '400px' }}>{t('biometricSubtext')}</p>
            <div className="biometric-visual-overlay"></div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="feature-card-premium w-33"
          >
            <div className="icon-box" style={{ color: '#3b82f6' }}><MapPin size={24} /></div>
            <h3>{t('geofenceShield')}</h3>
            <p>{t('geofenceSubtext')}</p>
            <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.05 }}>
              <Globe size={150} />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="feature-card-premium w-33"
          >
            <div className="icon-box" style={{ color: '#10b981' }}><Zap size={24} /></div>
            <h3>{t('precisionPayroll')}</h3>
            <p>{t('precisionPayrollSubtext')}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="feature-card-premium w-66"
            style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(2, 6, 23, 0.6))' }}
          >
            <div className="icon-box" style={{ color: '#8b5cf6' }}><Lock size={24} /></div>
            <h3>Military-Grade Security</h3>
            <p style={{ maxWidth: '500px' }}>Our platform uses end-to-end encryption and decentralized biometric hashing to ensure that your workforce data remains private and tamper-proof.</p>
          </motion.div>
        </div>
      </section>

      <footer style={{ padding: '80px 5%', textAlign: 'center', borderTop: '1px solid var(--landing-border)' }}>
        <div className="logo-text" style={{ marginBottom: '20px' }}>TRACK<span>FORCE</span></div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>&copy; 2026 TrackForce Enterprise. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
