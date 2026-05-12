import React, { useState, useEffect } from 'react';
import { 
  User, 
  Briefcase, 
  Camera, 
  Lock, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  UserPlus,
  Smartphone,
  Eye,
  EyeOff,
  TrendingUp,
  Upload, 

  FileText,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchSites, createEmployee, fetchEmployeeById, updateEmployee, fetchEmployees } from '../api/api';
import PremiumSelect from '../components/PremiumSelect';
import './AddEmployee.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AddEmployee = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [hubs, setHubs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [employees, setEmployees] = useState<any[]>([]);

  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    phone: '',
    password: '',
    designation: '',
    role: 'EMPLOYEE',
    siteId: '',
    avatar: null as string | null,
    hourlyRate: 0.0,
    overtimeType: 'MULTIPLIER', // FIXED or MULTIPLIER
    overtimeValue: 1.5,
    passportNumber: '',
    passportExpiry: '',
    passportIssue: '',
    dob: '',
    cvPath: null as string | null,
    idDocPath: null as string | null
  });
  
  const [files, setFiles] = useState({
    avatar: null as File | null,
    cv: null as File | null,
    idDoc: null as File | null
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      try {
        const [sites, allEmployees] = await Promise.all([fetchSites(), fetchEmployees()]);
        setHubs(sites);
        setEmployees(allEmployees);

        if (isEditMode) {
          const emp = await fetchEmployeeById(id);
          setFormData({
            employeeId: emp.employeeId || '',
            fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
            phone: emp.phone || '',
            password: '', // Leave blank for edit
            designation: emp.designation || '',
            role: emp.role || 'EMPLOYEE',
            siteId: emp.siteId || '',
            avatar: emp.avatar ? (emp.avatar.startsWith('http') ? emp.avatar : `${API_URL}${emp.avatar}`) : null,
            hourlyRate: emp.hourlyRate || 0.0,
            overtimeType: emp.overtimeType || 'MULTIPLIER',
            overtimeValue: emp.overtimeValue || 1.5,
            passportNumber: emp.passportNumber || '',
            passportExpiry: emp.passportExpiry ? new Date(emp.passportExpiry).toISOString().split('T')[0] : '',
            passportIssue: emp.passportIssue ? new Date(emp.passportIssue).toISOString().split('T')[0] : '',
            dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
            cvPath: emp.cvPath ? `${API_URL}${emp.cvPath}` : null,
            idDocPath: emp.idDocPath ? `${API_URL}${emp.idDocPath}` : null
          });
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to load workforce intelligence");
      } finally {
        setIsLoading(false);
      }
    };
    initPage();
  }, [id, isEditMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'cv' | 'idDoc') => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [field]: file }));
      if (field === 'avatar') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, avatar: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.avatar) {
      alert("Profile picture is mandatory. Please upload a photo.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const formDataToSend = new FormData();
      
      // Append all text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'avatar' && key !== 'cvPath' && key !== 'idDocPath' && value !== null && value !== undefined && value !== '') {
          formDataToSend.append(key, value.toString());
        }
      });

      // Append the files if selected
      if (files.avatar) formDataToSend.append('avatar', files.avatar);
      if (files.cv) formDataToSend.append('cv', files.cv);
      if (files.idDoc) formDataToSend.append('idDoc', files.idDoc);

      if (isEditMode) {
        await updateEmployee(id!, formDataToSend);
      } else {
        if (!files.avatar) {
          throw new Error("Profile picture is mandatory for new nodes.");
        }
        await createEmployee(formDataToSend);
      }
      navigate('/employees');
    } catch (err: any) {
      setError(err.message || 'Mission failed. Please check network protocols.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-state-premium">
        <div className="spinner-obsidian"></div>
        <p>Synchronizing Workforce Data...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="add-employee-page"
    >
      <header className="page-header">
        <div className="header-left">
          <div>
            <h1>{isEditMode ? "Edit Employee Profile" : "Add New Workforce Member"}</h1>
            <p>{isEditMode ? "Modify existing workforce data and biometric access levels." : "Set up a new workforce member with biometric access."}</p>
          </div>
          <button className="btn-icon-ghost back-btn-compact" onClick={() => navigate('/employees')}>
            <ChevronLeft size={20} />
          </button>
        </div>
      </header>

      <div className="glass-card form-container-premium">
        <form onSubmit={handleSubmit} className="premium-form">
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-section">
            <div className="section-header">
              <User size={20} />
              <h3>Basic Information</h3>
            </div>
            
            <div className="profile-top-hub" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Full Name <span className="required-star">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value.replace(/[0-9]/g, '')})}
                  placeholder="e.g. John Doe" 
                />
              </div>

              <div className="avatar-upload-compact">
                <div className="avatar-preview-md">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Preview" />
                  ) : (
                    <User size={32} />
                  )}
                  <label htmlFor="avatar-page-upload" className="upload-badge-md">
                    <Camera size={16} />
                  </label>
                </div>
                <input 
                  id="avatar-page-upload"
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'avatar')}
                  style={{ display: 'none' }}
                />
                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'center', opacity: 0.8 }}>Avatar <span className="required-star">*</span></p>
              </div>
            </div>

          </div>

          <div className="form-section">
            <div className="section-header">
              <Lock size={20} />
              <h3>Security & Authentication</h3>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Employee ID (Login ID) <span className="required-star">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  placeholder="e.g. TF001" 
                />
              </div>
              <div className="form-group">
                <label>{isEditMode ? "New Password" : "Initial Password"} <span className="required-star">*</span></label>
                <div className="password-input-wrapper" style={{ position: 'relative', maxWidth: '220px' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required={!isEditMode}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      opacity: 0.9,
                      transition: 'opacity 0.3s ease'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <Smartphone size={20} />
              <h3>Contact Details</h3>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Date of Birth</label>
                <input 
                  type="date" 
                  value={formData.dob}
                  onChange={(e) => setFormData({...formData, dob: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Phone Number <span className="required-star">*</span></label>
                <input 
                  type="tel" 
                  required 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 (555) 000-0000" 
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <CheckCircle2 size={20} />
              <h3>Payroll Parameters</h3>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Salary (Per Hour) <span className="required-star">*</span></label>
                <div className="input-with-label">
                  <span className="currency-prefix">₫</span>
                  <input 
                    type="number" 
                    step="1000"
                    min="0"
                    required
                    value={formData.hourlyRate || ''}
                    onChange={(e) => setFormData({...formData, hourlyRate: Math.max(0, e.target.value ? parseFloat(e.target.value) : 0)})}
                    placeholder="50,000" 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Overtime Protocol <span className="required-star">*</span></label>
                <PremiumSelect 
                  required
                  value={formData.overtimeType}
                  onChange={(val: string) => setFormData({...formData, overtimeType: val})}
                  options={[
                    { label: 'Multiplier (1x, 1.5x...)', value: 'MULTIPLIER' },
                    { label: 'Fixed Amount (VNĐ)', value: 'FIXED' }
                  ]}
                />
              </div>
              <div className="form-group">
                <label>{formData.overtimeType === 'MULTIPLIER' ? 'Multiplier Value' : 'Fixed Amount (₫)'} <span className="required-star">*</span></label>
                <div className="input-with-label">
                  <span className="currency-prefix">{formData.overtimeType === 'MULTIPLIER' ? <TrendingUp size={18} /> : '₫'}</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required
                    value={formData.overtimeValue || ''}
                    onChange={(e) => setFormData({...formData, overtimeValue: Math.max(0, e.target.value ? parseFloat(e.target.value) : 0)})}
                    placeholder={formData.overtimeType === 'MULTIPLIER' ? '1.5' : '100,000'} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <Briefcase size={20} />
              <h3>Project & Role</h3>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Designation <span className="required-star">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  placeholder="Software Engineer" 
                />
              </div>
              <div className="form-group">
                <label>Access Level <span className="required-star">*</span></label>
                <PremiumSelect 
                  required
                  disabled={!isAdmin}
                  value={formData.role}
                  onChange={(val: string) => setFormData({...formData, role: val})}
                  options={[
                    { label: 'Standard Employee', value: 'EMPLOYEE' },
                    { label: 'Manager', value: 'MANAGER' },
                    { label: 'Administrator', value: 'ADMIN' }
                  ]}
                />
              </div>
              <div className="form-group">
                <label>Project Site <span className="required-star">*</span></label>
                <PremiumSelect 
                  required
                  value={formData.siteId}
                  onChange={(val: string) => setFormData({...formData, siteId: val})}
                  options={[
                    { label: 'Select Project Site...', value: '' },
                    ...hubs
                      .filter(hub => {
                        // Only show hub if it's not assigned to anyone else
                        const assignedTo = employees.find(emp => emp.siteId === hub.id);
                        return !assignedTo || (isEditMode && assignedTo.id === id);
                      })
                      .map(hub => ({ label: hub.name, value: hub.id }))
                  ]}
                  placeholder="Select Project Site..."
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <CreditCard size={20} />
              <h3>Passport / ID Details (Optional)</h3>

            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Passport Number</label>
                <input 
                  type="text" 
                  value={formData.passportNumber}
                  onChange={(e) => setFormData({...formData, passportNumber: e.target.value})}
                  placeholder="e.g. A12345678" 
                />
              </div>
              <div className="form-group">
                <label>Issue Date</label>
                <input 
                  type="date" 
                  value={formData.passportIssue}
                  onChange={(e) => setFormData({...formData, passportIssue: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input 
                  type="date" 
                  value={formData.passportExpiry}
                  onChange={(e) => setFormData({...formData, passportExpiry: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <FileText size={20} />
              <h3>Employee Documents (Optional)</h3>

            </div>
            <div className="file-upload-grid-compact" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="file-upload-node">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Resume / Professional CV</label>

                <div className="upload-box-compact" style={{ 
                  height: '100px', 
                  border: '2px dashed var(--border)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  position: 'relative'
                }}>
                  <Upload size={20} color="var(--primary)" />
                  <span style={{ fontSize: '0.75rem', marginTop: '4px', textAlign: 'center', padding: '0 8px' }}>
                    {files.cv ? files.cv.name : (formData.cvPath ? 'CV Uploaded' : 'Upload CV')}
                  </span>
                  <input type="file" onChange={(e) => handleFileChange(e, 'cv')} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
              <div className="file-upload-node">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>ID Proof / Passport Copy</label>

                <div className="upload-box-compact" style={{ 
                  height: '100px', 
                  border: '2px dashed var(--border)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  position: 'relative'
                }}>
                  <Upload size={20} color="var(--primary)" />
                  <span style={{ fontSize: '0.75rem', marginTop: '4px', textAlign: 'center', padding: '0 8px' }}>
                    {files.idDoc ? files.idDoc.name : (formData.idDocPath ? 'ID Uploaded' : 'Upload ID')}
                  </span>
                  <input type="file" onChange={(e) => handleFileChange(e, 'idDoc')} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
            </div>
          </div>

          {!isEditMode && (
            <div className="enrollment-notice">
              <CheckCircle2 size={24} />
              <div>
                <h4>Face ID Enrollment Ready</h4>
                <p>The member will be required to scan their face during their first login to complete biometric enrollment.</p>
              </div>
            </div>
          )}

          <div className="form-actions-premium">
            <button type="button" onClick={() => navigate('/employees')} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : (isEditMode ? "Save Changes" : "Create Profile")}
              {isEditMode ? <Save size={18} style={{ marginLeft: '8px' }} /> : <UserPlus size={18} style={{ marginLeft: '8px' }} />}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AddEmployee;
