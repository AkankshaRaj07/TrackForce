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
  FileText,
  Activity,
  CreditCard,
  Smartphone,
  Mail,
  Calendar,
  Landmark,
  Eye,
  EyeOff,
  Briefcase,
  Fingerprint
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      addToast('Failed to load profile manifest', 'error');
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
        addToast('Identity Node Updated Successfully!', 'success');
      } catch (err) {
        addToast('Failed to update biometric identifier', 'error');
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

      <header className="profile-hero-section">
        <div className="hero-background-mesh"></div>
        <div className="hero-content">
          <div className="profile-avatar-wrapper">
            <div className="avatar-main">
              {user?.avatar ? (
                <img src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`} alt="Profile" />
              ) : (
                <User size={60} />
              )}
              <label htmlFor="avatar-upload" className="avatar-edit-btn">
                <Camera size={18} />
              </label>
              <input 
                id="avatar-upload"
                type="file" 
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="avatar-status-ring"></div>
          </div>
          <div className="hero-text-node">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {user?.firstName} {user?.lastName}
            </motion.h1>
            <div className="hero-meta-badges">
              <span className="badge-premium role">{user?.role}</span>
              <span className="badge-premium id">#{user?.employeeId}</span>
              <span className={`badge-premium status ${user?.isBiometricEnrolled ? 'verified' : 'pending'}`}>
                {user?.isBiometricEnrolled ? 'Biometrically Verified' : 'Enrollment Pending'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="profile-grid">
        {/* COLUMN 1: Personal & Identity */}
        <div className="profile-column">
          <section className="glass-card profile-section">
            <div className="section-header">
              <Fingerprint size={20} className="text-primary" />
              <h3>Identity Core</h3>
            </div>
            <div className="info-grid-creative">
              <InfoNode icon={<Mail />} label="Communication Node" value={user?.email} />
              <InfoNode icon={<Smartphone />} label="Mobile Identifier" value={fullProfile?.employee?.phone || 'Not Linked'} />
              <InfoNode icon={<Calendar />} label="Cycle of Birth" value={fullProfile?.employee?.dob ? new Date(fullProfile?.employee?.dob).toLocaleDateString() : 'Classified'} />
              <InfoNode icon={<Briefcase />} label="Operational Role" value={fullProfile?.employee?.designation || 'Specialist'} />
            </div>
          </section>

          <section className="glass-card profile-section">
            <div className="section-header">
              <Shield size={20} className="text-primary" />
              <h3>Security & Preferences</h3>
            </div>
            <div className="settings-list-creative">
              <div className="settings-item-node">
                <div className="item-label">
                  <Lock size={16} />
                  <span>Credential Protocol</span>
                </div>
                <div className="password-mask-node">
                  <input type={showPassword ? "text" : "password"} value="ENCRYPTED_NODE" readOnly />
                  <button onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="settings-item-node">
                <div className="item-label">
                  <Globe size={16} />
                  <span>Linguistic Interface</span>
                </div>
                <select className="creative-select" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                  <option value="en">English (UK)</option>
                  <option value="vi">Vietnamese (VN)</option>
                </select>
              </div>

              <div className="settings-item-node">
                <div className="item-label">
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  <span>Visual Atmosphere</span>
                </div>
                <button className={`creative-toggle ${theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme}>
                  <div className="toggle-knob"></div>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* COLUMN 2: Financial & Operations */}
        <div className="profile-column">
          <section className="glass-card profile-section">
            <div className="section-header">
              <Landmark size={20} className="text-primary" />
              <h3>Financial Distribution</h3>
            </div>
            <div className="info-grid-creative">
              <InfoNode icon={<Landmark />} label="Primary Bank" value={fullProfile?.employee?.bankName || 'Awaiting Link'} />
              <InfoNode icon={<CreditCard />} label="Account Index" value={fullProfile?.employee?.accountNumber || 'X-XXXX-XXXX'} />
              <InfoNode icon={<User />} label="Holder Identity" value={fullProfile?.employee?.accountHolderName || 'N/A'} />
              <InfoNode icon={<Activity />} label="Routing Node" value={fullProfile?.employee?.swiftCode || 'N/A'} />
            </div>
          </section>

          <section className="glass-card profile-section">
            <div className="section-header">
              <FileText size={20} className="text-primary" />
              <h3>Legal Manifest</h3>
            </div>
            <div className="manifest-list">
              <div className="manifest-item">
                <div className="m-label">Passport / ID Identifier</div>
                <div className="m-value">{fullProfile?.employee?.passportNumber || 'Pending'}</div>
              </div>
              <div className="manifest-item">
                <div className="m-label">Contractual Site</div>
                <div className="m-value">{fullProfile?.employee?.site?.name || 'Mobile Force'}</div>
              </div>
            </div>
          </section>

          <div className="profile-footer-meta">
            <Sparkles size={14} />
            <span>Obsidian Elite Identity Core v3.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoNode = ({ icon, label, value }: any) => (
  <div className="info-node-creative">
    <div className="node-icon">{icon}</div>
    <div className="node-text">
      <label>{label}</label>
      <span>{value}</span>
    </div>
  </div>
);

export default Profile;
