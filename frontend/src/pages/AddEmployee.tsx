import React, { useState, useEffect } from 'react';
import { 
  User, 
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
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchSites, createEmployee, fetchEmployeeById, updateEmployee } from '../api/api';
import PremiumSelect from '../components/PremiumSelect';
import './AddEmployee.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AddEmployee = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);


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
    idDocPath: null as string | null,
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    swiftCode: ''
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
        const [sitesData] = await Promise.all([fetchSites()]);
        setSites(sitesData);

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
            idDocPath: emp.idDocPath ? `${API_URL}${emp.idDocPath}` : null,
            bankName: emp.bankName || '',
            accountNumber: emp.accountNumber || '',
            accountHolderName: emp.accountHolderName || '',
            swiftCode: emp.swiftCode || ''
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
      className="add-employee-page-v3"
    >
      <form onSubmit={handleSubmit}>
        <header className="page-header-v3">
          <div className="header-left">
            <button type="button" className="btn-icon-ghost back-btn-compact" onClick={() => navigate('/employees')}>
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1>{isEditMode ? "Edit Profile" : "Add Workforce Member"}</h1>
              <p>{isEditMode ? "Update workforce details and permissions." : "Create a new profile with biometric and payroll details."}</p>
            </div>
          </div>
          <div className="header-actions">
            <button type="button" onClick={() => navigate('/employees')} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : (isEditMode ? "Save Changes" : "Create Profile")}
              {isEditMode ? <Save size={16} /> : <UserPlus size={16} />}
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="add-employee-layout-split">
          {/* Core & Security Card */}
          <div className="compact-section card-1">
              <h3 className="section-title-compact">1. Core Identity & Access</h3>
              <div className="core-security-header-row">
                <div className="avatar-field-compact">
                  <div className="avatar-preview-wrapper-compact">
                    {formData.avatar ? (
                      <img src={formData.avatar} alt="Preview" className="avatar-img-modern" />
                    ) : (
                      <div className="avatar-placeholder-modern">
                        <User size={24} />
                      </div>
                    )}
                    <label htmlFor="avatar-page-upload" className="avatar-upload-trigger">
                      <Camera size={12} />
                    </label>
                  </div>
                  <input 
                    id="avatar-page-upload"
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'avatar')}
                    style={{ display: 'none' }}
                  />
                </div>
                
                <div className="fields-grid">
                  <div className="form-field required">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value.replace(/[0-9]/g, '')})}
                      placeholder="e.g. John Doe" 
                    />
                  </div>
                  <div className="form-field required">
                    <label>Employee ID</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.employeeId}
                      onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                      placeholder="e.g. TF001" 
                    />
                  </div>
                  <div className="form-field required">
                    <label>{isEditMode ? "New Password" : "Initial Password"}</label>
                    <div className="password-input-wrapper-modern">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required={!isEditMode}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="••••••••" 
                      />
                      <button
                        type="button"
                        className="password-toggle-btn-modern"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-row-grid grid-2" style={{ marginTop: '12px' }}>
                <div className="form-field">
                  <label>Date of Birth</label>
                  <input 
                    type="date" 
                    value={formData.dob}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  />
                </div>

                <div className="form-field required">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 (555) 000-0000" 
                  />
                </div>
              </div>

              {!isEditMode && (
                <div className="enrollment-notice-compact" style={{ marginTop: '12px' }}>
                  <CheckCircle2 size={14} />
                  <span>Requires face scan during first login.</span>
                </div>
              )}
            </div>

            {/* Payroll & Project Card */}
            <div className="compact-section card-2">
              <h3 className="section-title-compact">2. Payroll & Project Assignment</h3>
              <div className="form-row-grid grid-3">
                <div className="form-field required">
                  <label>Salary (Per Hour)</label>
                  <div className="input-with-prefix-modern">
                    <span className="prefix-addon">₫</span>
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

                <div className="form-field required" style={{ gridColumn: 'span 2' }}>
                  <label>Overtime Protocol</label>
                  <div className="overtime-protocol-group-modern">
                    <PremiumSelect 
                      required
                      value={formData.overtimeType}
                      onChange={(val: string) => setFormData({...formData, overtimeType: val})}
                      options={[
                        { label: 'Multiplier', value: 'MULTIPLIER' },
                        { label: 'Fixed Amount', value: 'FIXED' }
                      ]}
                    />
                    <div className="input-with-prefix-modern">
                      <span className="prefix-addon">{formData.overtimeType === 'MULTIPLIER' ? <TrendingUp size={14} /> : '₫'}</span>
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

              <div className={`form-row-grid ${formData.role === 'EMPLOYEE' ? 'grid-3' : (formData.role === 'MANAGER' ? 'grid-2' : '')}`} style={{ marginTop: '12px' }}>
                <div className="form-field required">
                  <label>Access Level</label>
                  <PremiumSelect 
                    required
                    disabled={!isAdmin}
                    value={formData.role}
                    onChange={(val: string) => {
                      setFormData(prev => ({
                        ...prev,
                        role: val,
                        ...(val !== 'EMPLOYEE' ? { designation: '' } : {}),
                        ...(val === 'ADMIN' ? { siteId: '' } : {})
                      }));
                    }}
                    options={[
                      { label: 'Employee', value: 'EMPLOYEE' },
                      { label: 'Manager', value: 'MANAGER' },
                      { label: 'Admin', value: 'ADMIN' }
                    ]}
                  />
                </div>

                {formData.role !== 'ADMIN' && (
                  <div className="form-field required">
                    <label>Project Site</label>
                    <PremiumSelect 
                      required
                      value={formData.siteId}
                      onChange={(val: string) => setFormData({...formData, siteId: val})}
                      options={[
                        { label: 'Select Site...', value: '' },
                        ...sites.map(site => ({ label: site.name, value: site.id }))
                      ]}
                    />
                  </div>
                )}

                {formData.role === 'EMPLOYEE' && (
                  <div className="form-field required">
                    <label>Designation</label>
                    <PremiumSelect 
                      required
                      value={formData.designation}
                      onChange={(val: string) => setFormData({...formData, designation: val})}
                      options={[
                        { label: 'Select Designation...', value: '' },
                        { label: 'Supervisor', value: 'Supervisor' },
                        { label: 'Foreman', value: 'Foreman' },
                        { label: 'Experience Worker', value: 'Experience Worker' },
                        { label: 'Engineer', value: 'Engineer' },
                        { label: 'Fresh Worker', value: 'Fresh Worker' },
                        { label: 'Safety', value: 'Safety' },
                        { label: 'Drawing', value: 'Drawing' },
                        { label: 'QA/QC', value: 'QA/QC' },
                        { label: 'QS', value: 'QS' },
                        { label: 'Store keeper', value: 'Store keeper' },
                        { label: 'Sr. Foreman', value: 'Sr. Foreman' }
                      ]}
                    />
                  </div>
                )}
            </div>
          </div>

          {/* Financial Card */}
          <div className="compact-section card-4">
              <h3 className="section-title-compact">4. Bank Accounts</h3>
              <div className="form-row-grid grid-2">
                <div className="form-field">
                  <label>Bank Name</label>
                  <input 
                    type="text" 
                    value={formData.bankName}
                    onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                    placeholder="e.g. Vietcombank" 
                  />
                </div>

                <div className="form-field">
                  <label>Account Number</label>
                  <input 
                    type="text" 
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                    placeholder="e.g. 0123456789" 
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div className="form-field">
                  <label>Account Holder Name</label>
                  <input 
                    type="text" 
                    value={formData.accountHolderName}
                    onChange={(e) => setFormData({...formData, accountHolderName: e.target.value})}
                    placeholder="e.g. JOHN DOE" 
                  />
                </div>
              </div>
            </div>

            {/* Official Identification Card */}
            <div className="compact-section card-3">
              <h3 className="section-title-compact">3. Identification & Documents</h3>
              <div className="form-row-grid grid-3">
                <div className="form-field">
                  <label>Passport / ID Number</label>
                  <input 
                    type="text" 
                    value={formData.passportNumber}
                    onChange={(e) => setFormData({...formData, passportNumber: e.target.value})}
                    placeholder="e.g. A12345678" 
                  />
                </div>

                <div className="form-field">
                  <label>Passport Issue</label>
                  <input 
                    type="date" 
                    value={formData.passportIssue}
                    onChange={(e) => setFormData({...formData, passportIssue: e.target.value})}
                  />
                </div>

                <div className="form-field">
                  <label>Passport Expiry</label>
                  <input 
                    type="date" 
                    value={formData.passportExpiry}
                    onChange={(e) => setFormData({...formData, passportExpiry: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row-grid grid-2" style={{ marginTop: '12px' }}>
                <div className="form-field">
                  <label>Resume / CV</label>
                  <div className={`file-upload-zone-modern ${files.cv || formData.cvPath ? 'uploaded' : ''}`}>
                    <Upload size={16} className="upload-icon" />
                    <div className="upload-text">
                      <span className="file-name-display">
                        {files.cv ? files.cv.name : (formData.cvPath ? 'Resume_CV_Uploaded.pdf' : 'Upload Resume')}
                      </span>
                    </div>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileChange(e, 'cv')} />
                  </div>
                </div>

                <div className="form-field">
                  <label>ID Proof Document</label>
                  <div className={`file-upload-zone-modern ${files.idDoc || formData.idDocPath ? 'uploaded' : ''}`}>
                    <Upload size={16} className="upload-icon" />
                    <div className="upload-text">
                      <span className="file-name-display">
                        {files.idDoc ? files.idDoc.name : (formData.idDocPath ? 'ID_Proof_Uploaded.jpg' : 'Upload ID Proof')}
                      </span>
                    </div>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'idDoc')} />
                  </div>
                </div>
              </div>
            </div>
        </div>
      </form>
    </motion.div>
  );
};

export default AddEmployee;
