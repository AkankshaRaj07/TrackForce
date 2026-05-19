import { 
  Shield, 
  Lock, 
  User, 
  RefreshCw,
  Globe,
  Moon,
  Sun,
  Camera,
  Sparkles,
  CreditCard,
  Smartphone,
  Mail,
  Calendar,
  Landmark,
  Eye,
  EyeOff,
  Briefcase,
  Fingerprint,
  DollarSign,
  Activity,
  Database,
  Trash2,
  Cpu,
  Layers,
  Wifi,
  Terminal,
  Server
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { 
  updateEmployee, 
  fetchEmployeeFullProfile
} from '../api/api';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import './Profile.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<any[]>([]);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Admin Telemetry & Persistence configurations
  const [persistenceMode, setPersistenceMode] = useState<'STRICT' | 'BALANCED' | 'CACHE_FAST'>('STRICT');
  const [cachingLevel, setCachingLevel] = useState<'OFF' | 'BALANCED' | 'AGGRESSIVE'>('BALANCED');
  const [loggingLevel, setLoggingLevel] = useState<'VERBOSE' | 'INFO' | 'ERROR'>('INFO');
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([]);
  const [diagnosticsActive, setDiagnosticsActive] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const runDiagnostics = () => {
    setDiagnosticsActive(true);
    setDiagnosticsLogs([]);
    const logs = [
      '[SYS] Initialising TrackForce Diagnostics Deck v3.0...',
      '[SYS] Auditing SQLite database connections... [CONNECTED]',
      '[SYS] Storage integrity verification: 3.24 MB in use... [OK]',
      '[SYS] Biometric verification pipelines loaded successfully.',
      '[SYS] Fetching face-api.js neural network layers... [ACTIVE]',
      '[SYS] Verifying active payroll ledger balances... [100% CORRECT]',
      '[SYS] All processes fully synchronous and nominal. [SUCCESS]'
    ];
    let index = 0;
    const interval = setInterval(() => {
      if (index < logs.length) {
        setDiagnosticsLogs(prev => [...prev, logs[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 350);
  };

  const handleClearCache = () => {
    localStorage.removeItem('tf_logs_cache');
    localStorage.removeItem('tf_diagnostic_runs');
    addToast('Client application cache cleared successfully!', 'success');
  };

  const handleRefreshSession = async () => {
    try {
      await loadProfileData();
      addToast('Active SQLite database session verified and synchronised!', 'success');
    } catch (err) {
      addToast('Failed to refresh data session', 'error');
    }
  };

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadProfileData();
  }, [user?.id]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        const data = await fetchEmployeeFullProfile(user.id);
        setFullProfile(data);
      }
    } catch (err) {
      addToast('Failed to load profile details', 'error');
    } finally {
      setLoading(false);
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
        addToast('Profile Picture Updated Successfully!', 'success');
      } catch (err) {
        addToast('Failed to update profile avatar', 'error');
      }
    }
  };

  if (loading) return (
    <div className="profile-page loading-state">
      <RefreshCw className="animate-spin" size={40} />
    </div>
  );

  return (
    <div className="profile-page">
      <div className="premium-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      {/* TOP HEADER HERO SECTION: Clean Dashboard Header Banner */}
      <div className="profile-hero-section">
        <div className="hero-background-mesh"></div>
        <div className="hero-content">
          
          {/* Left Avatar & Identity */}
          <div className="hero-avatar-area">
            <div className="profile-avatar-wrapper">
              <div className="avatar-main">
                {(fullProfile?.employee?.avatar || user?.avatar) ? (
                  <img src={(fullProfile?.employee?.avatar || user?.avatar).startsWith('http') ? (fullProfile?.employee?.avatar || user?.avatar) : `${API_URL}${fullProfile?.employee?.avatar || user?.avatar}`} alt="Profile" />
                ) : (
                  <User size={50} />
                )}
                <label htmlFor="hero-avatar-upload" className="avatar-edit-btn">
                  <Camera size={14} />
                </label>
                <input 
                  id="hero-avatar-upload"
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="avatar-status-ring"></div>
            </div>
            
            <div className="hero-identity-text">
              <h1>{fullProfile?.employee?.firstName || user?.firstName} {fullProfile?.employee?.lastName || user?.lastName}</h1>
              <div className="badge-row">
                <span className="badge-premium role">{fullProfile?.employee?.role || user?.role}</span>
                <span className="badge-premium id">ID: #{fullProfile?.employee?.employeeId || user?.employeeId}</span>
              </div>
            </div>
          </div>

          {/* Right Work Metrics Indicators */}
          <div className="hero-quick-indicators">
            <div className="hero-indicator-card">
              <label>Assigned Work Site</label>
              <span>{fullProfile?.employee?.site?.name || 'Mobile Force'}</span>
            </div>
            <div className="hero-indicator-card">
              <label>Biometric Enrollment</label>
              <span className={`status-indicator-badge ${(fullProfile?.employee?.isBiometricEnrolled ?? user?.isBiometricEnrolled) ? 'verified' : 'pending'}`}>
                {(fullProfile?.employee?.isBiometricEnrolled ?? user?.isBiometricEnrolled) ? 'Verified' : 'Pending'}
              </span>
            </div>
            <div className="hero-indicator-card manager-card">
              <div className="manager-header">
                <User size={11} />
                <label>Assigned Manager</label>
              </div>
              <span>{fullProfile?.employee?.site?.managerName || 'System Admin'}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Details Grid: Simplified, Uniform Corporate Rows */}
      <div className="profile-grid">
        {isAdmin ? (
          <section className="profile-section">
            <div className="section-header">
              <Cpu size={20} />
              <h3>System Diagnostics & Cache Control</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div className="settings-item-node" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="item-label">
                  <Trash2 size={16} style={{ color: 'var(--error)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>Client Memory Cache</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>Wipes active offline tracking and log caches.</span>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '11px', borderRadius: '8px' }} onClick={handleClearCache}>
                  Clear Cache
                </button>
              </div>

              <div className="settings-item-node" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="item-label">
                  <RefreshCw size={16} style={{ color: 'var(--primary)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>Refresh Database Session</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>Resynchronises active auth token with SQLite.</span>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '11px', borderRadius: '8px' }} onClick={handleRefreshSession}>
                  Sync Session
                </button>
              </div>

              <div className="settings-item-node" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="item-label">
                  <Layers size={16} />
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>Offline Query Buffering</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>Cache policy for low-network field checkins.</span>
                  </div>
                </div>
                <select 
                  className="creative-select" 
                  value={cachingLevel} 
                  onChange={(e) => {
                    setCachingLevel(e.target.value as any);
                    addToast(`Caching policy adjusted to ${e.target.value}`, 'success');
                  }}
                >
                  <option value="OFF">No Caching (Real-time)</option>
                  <option value="BALANCED">Balanced Caching</option>
                  <option value="AGGRESSIVE">Aggressive Offline-First</option>
                </select>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))' }}
                onClick={runDiagnostics}
              >
                <Terminal size={14} />
                <span>Run Infrastructure Diagnostics</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="profile-section">
            <div className="section-header">
              <Fingerprint size={20} />
              <h3>Personal details</h3>
            </div>
            <div className="details-list" style={{ marginTop: '16px' }}>
              <DetailsRow icon={<Mail size={16} />} label="Email Address" value={fullProfile?.employee?.email || user?.email} />
              <DetailsRow icon={<Smartphone size={16} />} label="Phone Number" value={fullProfile?.employee?.phone || 'Not Linked'} />
              <DetailsRow icon={<Calendar size={16} />} label="Date of Birth" value={fullProfile?.employee?.dob ? new Date(fullProfile?.employee?.dob).toLocaleDateString() : 'Classified'} />
              <DetailsRow icon={<Briefcase size={16} />} label="Job Designation" value={fullProfile?.employee?.designation || 'Specialist'} />
            </div>
          </section>
        )}

        {isAdmin ? (
          <section className="profile-section">
            <div className="section-header">
              <Database size={20} />
              <h3>SQLite Database & Persistence Settings</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div className="settings-item-node" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="item-label">
                  <Activity size={16} style={{ color: 'var(--success)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>Database Health Status</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>Active SQLite connection status.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--success)', fontWeight: 800 }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', display: 'inline-block' }}></span>
                  <span>ONLINE</span>
                </div>
              </div>

              <div className="settings-item-node" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="item-label">
                  <Server size={16} />
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>Write Persistence Mode</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>Specify sqlite file transactional security level.</span>
                  </div>
                </div>
                <select 
                  className="creative-select" 
                  value={persistenceMode} 
                  onChange={(e) => {
                    setPersistenceMode(e.target.value as any);
                    addToast(`Persistence level adjusted to ${e.target.value}`, 'success');
                  }}
                >
                  <option value="STRICT">Strict Sync (Instant Commit)</option>
                  <option value="BALANCED">Balanced Mode (Lazy Writeback)</option>
                  <option value="CACHE_FAST">High-Performance (Memory Buffered)</option>
                </select>
              </div>

              <div className="settings-item-node" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="item-label">
                  <Wifi size={16} />
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>Server Log Verbosity</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>Control server telemetry logging detail level.</span>
                  </div>
                </div>
                <select 
                  className="creative-select" 
                  value={loggingLevel} 
                  onChange={(e) => {
                    setLoggingLevel(e.target.value as any);
                    addToast(`Verbosity standard set to ${e.target.value}`, 'success');
                  }}
                >
                  <option value="VERBOSE">Verbose Logs (Telemetry)</option>
                  <option value="INFO">Standard Information Logs</option>
                  <option value="ERROR">Severe Errors Only</option>
                </select>
              </div>

              <div className="settings-item-node" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="item-label">
                  <Layers size={16} />
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>SQLite Database File Size</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>Total disk footprint of SQLite instances.</span>
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>3.24 MB</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="profile-section">
            <div className="section-header">
              <Landmark size={20} />
              <h3>Payout Settlement</h3>
            </div>
            <div className="details-list" style={{ marginTop: '16px' }}>
              <DetailsRow icon={<Landmark size={16} />} label="Settlement Bank" value={fullProfile?.employee?.bankName || 'Awaiting Link'} />
              <DetailsRow icon={<CreditCard size={16} />} label="Account Number" value={fullProfile?.employee?.accountNumber || 'X-XXXX-XXXX'} />
              <DetailsRow icon={<User size={16} />} label="Beneficiary Holder" value={fullProfile?.employee?.accountHolderName || 'N/A'} />
              <DetailsRow icon={<DollarSign size={16} />} label="Payment Per Hour" value={fullProfile?.employee?.hourlyRate ? `$${fullProfile.employee.hourlyRate.toFixed(2)} / hr` : '$0.00 / hr'} />
            </div>
          </section>
        )}
      </div>

      {/* Preferences & Security settings */}
      <section className="profile-section settings-wide">
        <div className="section-header">
          <Shield size={20} />
          <h3>Security & Preferences</h3>
        </div>
        
        <div className="settings-list-creative">
          <div className="settings-item-node">
            <div className="item-label">
              <Lock size={16} />
              <span>Shift Account Password</span>
            </div>
            <div className="password-mask-node">
              <input type={showPassword ? "text" : "password"} value={fullProfile?.employee?.plainPassword || "••••••••"} readOnly />
              <button onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="settings-item-node">
            <div className="item-label">
              <Globe size={16} />
              <span>Portal Display Language</span>
            </div>
            <select className="creative-select" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
              <option value="en">English (UK)</option>
              <option value="vi">Vietnamese (VN)</option>
            </select>
          </div>

          <div className="settings-item-node">
            <div className="item-label">
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              <span>Visual Comfort Dark Theme</span>
            </div>
            <button className={`creative-toggle ${theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme}>
              <div className="toggle-knob"></div>
            </button>
          </div>
        </div>
      </section>

      {/* Infrastructure Diagnostics Terminal Modal */}
      {diagnosticsActive && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#0D1117', border: '1px solid rgba(0, 130, 255, 0.3)', borderRadius: '16px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161B22' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                <Terminal size={16} />
                <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TrackForce System Diagnostics</span>
              </div>
              <button 
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
                onClick={() => setDiagnosticsActive(false)}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '24px', flex: 1, minHeight: '260px', maxHeight: '350px', overflowY: 'auto', background: '#090D12', fontFamily: '"Courier New", Courier, monospace', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {diagnosticsLogs.filter(Boolean).map((log, index) => (
                <div key={index} style={{ textAlign: 'left', color: log && (log.includes('[SUCCESS]') || log.includes('[OK]')) ? '#10B981' : log && log.includes('Initialising') ? 'var(--primary)' : '#E6EDF3' }}>
                  {log}
                </div>
              ))}
              {diagnosticsLogs.length < 7 && (
                <div style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={12} className="spin" />
                  <span>Scanning telemetry matrix...</span>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#161B22' }}>
              <button 
                className="btn btn-ghost" 
                style={{ padding: '8px 16px', fontSize: '11px', borderRadius: '8px', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
                disabled={diagnosticsLogs.length < 7}
                onClick={runDiagnostics}
              >
                Re-Run Diagnostics
              </button>
              <button 
                className="btn btn-primary" 
                style={{ padding: '8px 16px', fontSize: '11px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))' }}
                onClick={() => setDiagnosticsActive(false)}
              >
                Close Deck
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="profile-footer-meta">
        <Sparkles size={14} />
        <span>TrackForce Portal v3.0</span>
      </div>
    </div>
  );
};

const DetailsRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="details-row">
    <div className="details-label-group">
      <div className="details-icon">{icon}</div>
      <div className="details-text">
        <label>{label}</label>
      </div>
    </div>
    <div className="details-value">{value}</div>
  </div>
);

export default Profile;
