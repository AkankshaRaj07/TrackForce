import { useState, useEffect } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { 
  Briefcase,
  Calendar,
  ChevronLeft,
  Clock,
  Coins,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Key,
  Landmark,
  Lock,
  Mail,
  MapPin,
  Smartphone,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';



import { motion } from 'framer-motion';



import { fetchEmployeeFullProfile } from '../api/api';
import DocumentModal from '../components/DocumentModal';
import { useAuth } from '../context/AuthContext';
import './EmployeeDetails.css';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPassword, setShowPassword] = useState(true);
  const [docModal, setDocModal] = useState({ isOpen: false, url: '', title: '' });

  const openDoc = (url: string, title: string) => {
    setDocModal({ isOpen: true, url: `${API_URL}${url}`, title });
  };


  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }

    const loadProfile = async () => {
      try {
        const fullProfile = await fetchEmployeeFullProfile(id!);
        setData(fullProfile);
      } catch (err) {
        console.error("Failed to fetch workforce intelligence:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [id, isAdmin, user, navigate]);

  if (loading) {
    return (
      <div className="loading-state">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <TrendingUp size={48} color="var(--primary)" />
        </motion.div>
        <p>Decrypting Workforce Intelligence...</p>
      </div>
    );
  }

  if (!data) return <div className="error-state">Node Not Found in Grid</div>;

  const { employee, attendance, stats } = data;

  return (
    <div className="employee-details-page">

      {/* Hero Section */}
      <section className="glass-card employee-hero-card-premium">
        <button 
          className="hero-back-btn-top-right" 
          onClick={() => navigate('/employees')}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="hero-avatar-wrapper">
          <div className="hero-avatar-large">
            {employee.avatar ? (
              <img src={employee.avatar.startsWith('http') ? employee.avatar : `${API_URL}${employee.avatar}`} alt="" />
            ) : (
              <User size={64} />
            )}
          </div>
          <button 
            className="avatar-edit-badge" 
            onClick={() => navigate(`/employees/edit/${employee.id}`)}
            title="Edit Identity Manifest"
          >
            <Edit3 size={16} />
          </button>
        </div>

        <div className="hero-info-cluster">
          <div className="hero-meta-tags">
            <span className="id-tag-premium">{employee.employeeId}</span>
            <span className={`status-badge-premium ${employee.status.toLowerCase()}`}>{employee.status}</span>
            <span className={`biometric-badge-premium ${employee.isBiometricEnrolled ? 'verified' : 'pending'}`}>
              {employee.isBiometricEnrolled ? 'Verified' : 'Not Enrolled'}
            </span>
          </div>
          <h1>{employee.firstName} {employee.lastName}</h1>
          
          <div className="hero-sub-meta" style={{ display: 'flex', gap: '2.5rem', color: 'var(--text-secondary)', alignItems: 'center', marginTop: '1rem' }}>
            <div className="credential-node-premium">
              <Key size={14} />
              <label>Login ID:</label>
              <span>{employee.employeeId}</span>
            </div>
            <div className="credential-node-premium">
              <Lock size={14} />
              <label>Password:</label>
              <div className="pass-toggle-node">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={employee.plainPassword || "••••••••"} 
                  readOnly 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pass-visibility-btn"
                  title={showPassword ? "Mask Password" : "Reveal Password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="hero-sub-meta" style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} /> {employee.designation || 'Operational Specialist'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} /> {employee.site?.name || 'Unassigned Site'}
            </span>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="intelligence-grid">
        <StatCard 
          icon={<Clock size={24} />} 
          label="Total Hours" 
          value={`${parseFloat(stats.totalHours || '0').toFixed(1)}h`} 
          color="var(--primary)" 
        />
        <StatCard 
          icon={<Wallet size={24} />} 
          label="Gross Earnings" 
          value={`${parseFloat(stats.totalEarnings || '0').toLocaleString()} ₫`} 
          color="#10b981" 
        />
        <StatCard 
          icon={<Calendar size={24} />} 
          label="Active Days" 
          value={stats.totalDays} 
          color="#8b5cf6" 
        />
      </div>

      {/* Tabs */}
      <nav className="details-navigation">
        <button 
          className={`nav-tab-premium ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`nav-tab-premium ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance History
        </button>
      </nav>

      <main className="details-content">
        {activeTab === 'overview' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="creative-overview-deck"
          >
            <div className="deck-col-main">
              <div className="glass-tile-premium identity-site-tile">
                <div className="tile-header">
                  <User size={20} />
                  <h4>Personal Details</h4>
                </div>
                <div className="tile-content-stack">
                  <InfoItem icon={<Smartphone size={16} />} label="Phone Number" value={employee.phone || 'Not provided'} />
                  <InfoItem icon={<Calendar size={16} />} label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString() : 'Not provided'} />
                  <InfoItem icon={<Calendar size={16} />} label="Joining Date" value={new Date(employee.createdAt).toLocaleDateString()} />
                </div>
              </div>

              <div className="deck-row-sub">
                <div className="glass-tile-premium finance-tile">
                  <div className="tile-header">
                    <Coins size={20} />
                    <h4>Salary Details</h4>
                  </div>
                  <div className="tile-data-large">
                    <span className="large-value">{employee.hourlyRate?.toLocaleString() || '0'} ₫</span>
                    <span className="label">Per Hour</span>
                  </div>
                  <div className="tile-footer-meta">
                    <TrendingUp size={14} /> 
                    <span>Overtime: {employee.overtimeType === 'MULTIPLIER' ? `${employee.overtimeValue}x Multiplier` : `${employee.overtimeValue?.toLocaleString()} ₫ Fixed`}</span>
                  </div>
                </div>

                <div className="glass-tile-premium performance-tile">
                  <div className="tile-header">
                    <TrendingUp size={20} />
                    <h4>Attendance Stats</h4>
                  </div>
                  <div className="mini-stat-cluster">
                    <div className="mini-stat">
                      <span>Present Days</span>
                      <strong>{stats.totalDays}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Working Hours</span>
                      <strong>{parseFloat(stats.totalHours || '0').toFixed(1)}h</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="deck-col-side">
              <div className="glass-tile-premium identity-site-tile" style={{ marginTop: '1.5rem' }}>
                <div className="tile-header">
                  <Landmark size={20} />
                  <h4>Financial Node</h4>
                </div>
                <div className="tile-content-stack">
                  <InfoItem icon={<Landmark size={14} />} label="Bank Name" value={employee.bankName || 'Not provided'} />
                  <InfoItem icon={<CreditCard size={14} />} label="Account No." value={employee.accountNumber || 'Not provided'} />
                  <InfoItem icon={<User size={14} />} label="Account Holder" value={employee.accountHolderName || 'Not provided'} />
                </div>
              </div>

              <div className="glass-tile-premium identity-site-tile" style={{ marginTop: '1.5rem' }}>
                <div className="tile-header">
                  <CreditCard size={20} />
                  <h4>Passport Intelligence</h4>
                </div>
                <div className="tile-content-stack">
                  <InfoItem icon={<Smartphone size={14} />} label="Passport No." value={employee.passportNumber || 'Not provided'} />
                  <InfoItem icon={<Calendar size={14} />} label="Issue Date" value={employee.passportIssue ? new Date(employee.passportIssue).toLocaleDateString() : '--'} />
                  <InfoItem icon={<Calendar size={14} />} label="Expiry Date" value={employee.passportExpiry ? new Date(employee.passportExpiry).toLocaleDateString() : '--'} />
                </div>
              </div>

              <div className="glass-tile-premium documents-tile" style={{ marginTop: '1.5rem' }}>
                <div className="tile-header">
                  <FileText size={20} />
                  <h4>Documentation</h4>
                </div>
                <div className="doc-link-stack">
                  <div className="doc-link-node">
                    <span>Resume / CV</span>
                    {employee.cvPath ? (
                      <button onClick={() => openDoc(employee.cvPath, 'Employee Resume')} className="doc-btn">
                        <Eye size={14} /> View
                      </button>
                    ) : (
                      <span className="not-uploaded">Pending</span>
                    )}
                  </div>
                  <div className="doc-link-node">
                    <span>ID Proof / Passport</span>
                    {employee.idDocPath ? (
                      <button onClick={() => openDoc(employee.idDocPath, 'Identity Proof')} className="doc-btn">
                        <Eye size={14} /> View
                      </button>
                    ) : (
                      <span className="not-uploaded">Pending</span>
                    )}
                  </div>


                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="attendance-pane"
          >
            <div className="attendance-timeline-premium">
              {attendance.length > 0 ? attendance.map((log: any) => (
                <div key={log.id} className="glass-card log-entry-card">
                  <div className="log-date-cluster">
                    <span className="log-date">{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="log-day">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                  </div>

                  <div className="log-details-cluster">
                    <div className="time-row">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#10b981" /> In: <strong>{new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                      </span>
                      {log.clockOut ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#ef4444" /> Out: <strong>{new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        </span>
                      ) : (
                        <span className="status-badge-premium pending">Active Session</span>
                      )}
                    </div>
                    <div className="location-row" style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                      <span className="location-tag-premium">
                        <MapPin size={12} /> {log.clockInLat.toFixed(4)}, {log.clockInLong.toFixed(4)} (Check-in)
                      </span>
                      {log.clockOutLat && (
                        <span className="location-tag-premium">
                          <MapPin size={12} /> {log.clockOutLat.toFixed(4)}, {log.clockOutLong.toFixed(4)} (Check-out)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="log-proof-cluster-dual">
                    <div className="proof-node-premium">
                      <span className="proof-label">Check-in</span>
                      {log.biometricProof ? (
                        <div className="proof-img-container" onClick={() => window.open(log.biometricProof.startsWith('http') ? log.biometricProof : `${API_URL}${log.biometricProof}`, '_blank')}>
                          <img src={log.biometricProof.startsWith('http') ? log.biometricProof : `${API_URL}${log.biometricProof}`} alt="Check-in Proof" />
                          <div className="proof-overlay"><ExternalLink size={12} /></div>
                        </div>
                      ) : (
                        <div className="proof-img-container no-proof"><ImageIcon size={20} color="var(--border)" /></div>
                      )}
                    </div>

                    <div className="proof-node-premium">
                      <span className="proof-label">Check-out</span>
                      {log.biometricProofOut ? (
                        <div className="proof-img-container" onClick={() => window.open(log.biometricProofOut.startsWith('http') ? log.biometricProofOut : `${API_URL}${log.biometricProofOut}`, '_blank')}>
                          <img src={log.biometricProofOut.startsWith('http') ? log.biometricProofOut : `${API_URL}${log.biometricProofOut}`} alt="Check-out Proof" />
                          <div className="proof-overlay"><ExternalLink size={12} /></div>
                        </div>
                      ) : (
                        <div className="proof-img-container no-proof"><ImageIcon size={20} color="var(--border)" /></div>
                      )}
                    </div>
                    <span className={`status-badge-premium ${log.status.toLowerCase()}`}>{log.status}</span>
                  </div>
                </div>
              )) : (
                <div className="empty-state-premium">
                  <Clock size={48} />
                  <p>No historical attendance nodes found for this identity.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      <DocumentModal 
        isOpen={docModal.isOpen}
        onClose={() => setDocModal({ ...docModal, isOpen: false })}
        docUrl={docModal.url}
        docTitle={docModal.title}
      />
    </div>

  );
};

const StatCard = ({ icon, label, value, color }: any) => (
  <div className="glass-card intel-card">
    <div className="intel-icon" style={{ borderColor: `${color}44`, color }}>
      {icon}
    </div>
    <div className="intel-content">
      <span>{label}</span>
      <h3>{value}</h3>
    </div>
  </div>
);

const InfoItem = ({ icon, label, value }: any) => (
  <div className="info-item-stack">
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
      {icon} {label}
    </label>
    <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{value}</span>
  </div>
);

export default EmployeeDetails;
