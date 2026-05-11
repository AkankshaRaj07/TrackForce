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
import { fetchConfig, updateConfig as syncConfig, updateEmployee } from '../api/api';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import './Settings.css';

const Settings = () => {
  const { user, updateUser } = useAuth();
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
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const updated = await updateEmployee(user.id, { avatar: base64 });
          updateUser(updated);
          addToast('Identity Node Updated Successfully!', 'success');
        } catch (err) {
          addToast('Failed to update biometric identifier', 'error');
        }
      };
      reader.readAsDataURL(file);
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
            System Parameters
          </motion.h1>
          <p>Configure global security protocols and personalization nodes.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={18} /> Save Configurations
        </button>
      </header>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="settings-column">
          <section className="glass-card profile-settings">
            <h3>Identity Node</h3>
            <div className="avatar-edit">
              <div className="avatar-preview">
                {avatar ? <img src={avatar} alt="User" /> : <User size={40} />}
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
                <span className="badge badge-admin">{user?.role}</span>
              </div>
            </div>
            
            <div className="settings-list">
              <div className="settings-item">
                <div className="item-info">
                  <Globe size={18} />
                  <span>Language Node</span>
                </div>
                <select className="premium-select">
                  <option>English (UK)</option>
                  <option>Hindi (IN)</option>
                </select>
              </div>
              <div className="settings-item">
                <div className="item-info">
                  {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                  <span>Appearance Mode</span>
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
                  <span>Biometric Status</span>
                </div>
                <span className={`badge ${user?.isBiometricEnrolled ? 'badge-admin' : 'badge-warning'}`} style={user?.isBiometricEnrolled ? { borderColor: 'var(--success)', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' } : {}}>
                  {user?.isBiometricEnrolled ? 'Verified' : 'Not Enrolled'}
                </span>
              </div>
            </div>
          </section>

          <section className="glass-card security-nodes">
            <div className="section-title-with-icon">
              <Shield size={20} color="var(--primary)" />
              <h3>Security Protocols</h3>
            </div>
            <div className="settings-list">
              <div className="settings-item">
                <div className="item-info">
                  <MapPin size={18} />
                  <div>
                    <span>Strict Geofencing</span>
                    <p>Prevent clock-in outside 300m radius</p>
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
                    <span>AI Biometric Enforcement</span>
                    <p>Mandatory facial match for every clock event</p>
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

        {/* System & Notifications */}
        <div className="settings-column">
          <section className="glass-card notification-nodes">
            <div className="section-title-with-icon">
              <Bell size={20} color="var(--primary)" />
              <h3>Intelligence Feed</h3>
            </div>
            <div className="settings-list">
              <div className="settings-item">
                <div className="item-info">
                  <span>Push Notifications</span>
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
                  <span>Security Alerts</span>
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
              <h3>Infrastructure Node</h3>
            </div>
            <div className="health-stats">
              <div className="health-item">
                <div className="h-label">
                  <span>Database Synchronization</span>
                  <span className="status-text online">Syncing</span>
                </div>
                <div className="h-bar"><div className="h-fill" style={{ width: '92%' }}></div></div>
              </div>
              <div className="health-item">
                <div className="h-label">
                  <span>API Latency</span>
                  <span className="status-text online">24ms</span>
                </div>
                <div className="h-bar"><div className="h-fill" style={{ width: '98%' }}></div></div>
              </div>
            </div>
            <button className="btn btn-ghost btn-block" style={{ marginTop: '20px' }}>
              <RefreshCw size={18} /> Clear Persistence Cache
            </button>
          </section>

          <div className="version-info">
            <Sparkles size={14} />
            <span>TrackForce Enterprise v2.4.0 (Obsidian Gold)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
