import { 
  Shield, 
  Lock, 
  Bell, 
  MapPin, 
  User, 
  Save, 
  RefreshCw,
  Globe,
  Database,
  Moon,
  Sun,
  Camera,
  Sparkles
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { fetchConfig, updateConfig as syncConfig, updateEmployee } from '../api/api';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import './Settings.css';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const avatar = user?.avatar || null;
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<any[]>([]);
  
  // Settings States
  const [notifications, setNotifications] = useState(true);
  const [geofenceStrict, setGeofenceStrict] = useState(true);
  const [biometricRequired, setBiometricRequired] = useState(true);
  const [config, setConfig] = useState<any>(null);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await fetchConfig();
      setConfig(data);
      if (data) {
        setGeofenceStrict(data.strictGeofencing);
        setBiometricRequired(data.biometricEnforcement);
      }
    } catch (err) {
      addToast('Failed to load enterprise config', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    addToast(`Theme switched to ${newTheme} mode`, 'info');
  };

  const handleSave = async () => {
    try {
      await syncConfig({
        ...config,
        strictGeofencing: geofenceStrict,
        biometricEnforcement: biometricRequired
      });
      addToast('Enterprise Intelligence Synced Successfully!', 'success');
    } catch (err) {
      addToast('Failed to sync security node', 'error');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('employeeId', user.employeeId);
        formData.append('fullName', `${user.firstName} ${user.lastName}`);
        
        const updated = await updateEmployee(user.id, formData);
        updateUser(updated);
        addToast('Identity Node Updated Successfully!', 'success');
      } catch (err) {
        addToast('Failed to update biometric identifier', 'error');
      }
    }
  };

  if (loading) return <div className="loading-state">Decrypting Secure Config...</div>;

  return (
    <div className="settings-page">
      <div className="premium-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      <header className="page-header-premium">
        <div className="header-text">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {t('systemParameters')}
          </motion.h1>
          <p>{t('systemParametersSubtext')}</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={18} /> {t('saveConfigurations')}
        </button>
      </header>

      <div className="settings-grid">
        <div className="settings-column">
          <section className="glass-card profile-settings">
            <h3>{t('identityNode')}</h3>
            <div className="avatar-edit">
              <div className="avatar-preview">
                {user?.avatar ? (
                  <img src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`} alt="User" />
                ) : (
                  <User size={40} />
                )}
                <label htmlFor="avatar-upload" className="edit-btn">
                  <Camera size={16} />
                </label>
                <input 
                  id="avatar-upload"
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="user-details">
                <h4>{user?.firstName} {user?.lastName}</h4>
                <p>{user?.email}</p>
                <span className="badge badge-admin">{user?.role === 'ADMIN' ? t('admin') : user?.role}</span>
              </div>
            </div>
            
            <div className="settings-list">
              <div className="settings-item">
                <div className="item-info">
                  <Globe size={18} />
                  <span>{t('languageNode')}</span>
                </div>
                <select 
                  className="premium-select"
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                >
                  <option value="en">English (UK)</option>
                  <option value="vi">Vietnamese (VN)</option>
                </select>
              </div>
              <div className="settings-item">
                <div className="item-info">
                  {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                  <span>{t('appearanceMode')}</span>
                </div>
                <button 
                  className={`toggle-switch ${theme === 'dark' ? 'active' : ''}`}
                  onClick={toggleTheme}
                >
                  <div className="switch-knob"></div>
                </button>
              </div>
              <div className="settings-item">
                <div className="item-info">
                  <Shield size={18} color={user?.isBiometricEnrolled ? "var(--success)" : "var(--text-tertiary)"} />
                  <span>{t('biometricStatus')}</span>
                </div>
                <span className={`badge ${user?.isBiometricEnrolled ? 'badge-admin' : 'badge-warning'}`} style={user?.isBiometricEnrolled ? { borderColor: 'var(--success)', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' } : {}}>
                  {user?.isBiometricEnrolled ? t('verified') : t('notEnrolled')}
                </span>
              </div>
            </div>
          </section>

          <section className="glass-card security-nodes">
            <div className="section-title-with-icon">
              <Shield size={20} color="var(--primary)" />
              <h3>{t('securityProtocols')}</h3>
            </div>
            <div className="settings-list">
              <div className="settings-item">
                <div className="item-info">
                  <MapPin size={18} />
                  <div>
                    <span>{t('strictGeofencing')}</span>
                    <p>{t('strictGeofencingSubtext')}</p>
                  </div>
                </div>
                <button 
                  className={`toggle-switch ${geofenceStrict ? 'active' : ''}`}
                  onClick={() => setGeofenceStrict(!geofenceStrict)}
                >
                  <div className="switch-knob"></div>
                </button>
              </div>
              <div className="settings-item">
                <div className="item-info">
                  <Lock size={18} />
                  <div>
                    <span>{t('biometricEnforcement')}</span>
                    <p>{t('biometricEnforcementSubtext')}</p>
                  </div>
                </div>
                <button 
                  className={`toggle-switch ${biometricRequired ? 'active' : ''}`}
                  onClick={() => setBiometricRequired(!biometricRequired)}
                >
                  <div className="switch-knob"></div>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-column">
          <section className="glass-card notification-nodes">
            <div className="section-title-with-icon">
              <Bell size={20} color="var(--primary)" />
              <h3>{t('intelligenceFeed')}</h3>
            </div>
            <div className="settings-list">
              <div className="settings-item">
                <div className="item-info">
                  <span>{t('pushNotifications')}</span>
                </div>
                <button 
                  className={`toggle-switch ${notifications ? 'active' : ''}`}
                  onClick={() => setNotifications(!notifications)}
                >
                  <div className="switch-knob"></div>
                </button>
              </div>
              <div className="settings-item">
                <div className="item-info">
                  <span>{t('securityAlerts')}</span>
                </div>
                <button className="toggle-switch active">
                  <div className="switch-knob"></div>
                </button>
              </div>
            </div>
          </section>

          <section className="glass-card system-health">
            <div className="section-title-with-icon">
              <Database size={20} color="var(--primary)" />
              <h3>{t('infrastructureNode')}</h3>
            </div>
            <div className="health-stats">
              <div className="health-item">
                <div className="h-label">
                  <span>{t('dbSync')}</span>
                  <span className="status-text online">{t('syncing')}</span>
                </div>
                <div className="h-bar"><div className="h-fill" style={{ width: '92%' }}></div></div>
              </div>
              <div className="health-item">
                <div className="h-label">
                  <span>{t('apiLatency')}</span>
                  <span className="status-text online">24ms</span>
                </div>
                <div className="h-bar"><div className="h-fill" style={{ width: '98%' }}></div></div>
              </div>
            </div>
            <button className="btn btn-ghost btn-block" style={{ marginTop: '20px' }}>
              <RefreshCw size={18} /> {t('clearCache')}
            </button>
          </section>

          <div className="version-info">
            <Sparkles size={14} />
            <span>TrackForce Enterprise v2.4.0 (Eco-Executive)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
