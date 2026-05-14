import React, { useState, useEffect } from 'react';
import { 
  User, 
  ChevronLeft,
  AlertCircle,
  Save,
  FileText,
  CreditCard,

  Upload,
  CheckCircle,
  Camera,
  ShieldCheck,
  Fingerprint
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useNavigate, useParams } from 'react-router-dom';
import { fetchEmployeeFullProfile, updateEmployee, enrollBiometric } from '../api/api';
import './CompleteProfile.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CompleteProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    phone: '',
    email: '',
    designation: '',
    siteId: '',
    hourlyRate: 0,
    overtimeType: 'MULTIPLIER',
    overtimeValue: 1.5,
    passportNumber: '',
    passportExpiry: '',
    passportIssue: '',
    dob: '',
    avatar: null as string | null,
    cvPath: null as string | null,
    idDocPath: null as string | null
  });

  const [files, setFiles] = useState({
    avatar: null as File | null,
    cv: null as File | null,
    idDoc: null as File | null
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchEmployeeFullProfile(id!);
        const { employee } = data;
        setFormData({
          employeeId: employee.employeeId || '',
          fullName: `${employee.firstName} ${employee.lastName}`,
          phone: employee.phone || '',
          email: employee.email || '',
          designation: employee.designation || '',
          siteId: employee.siteId || '',
          hourlyRate: employee.hourlyRate || 0,
          overtimeType: employee.overtimeType || 'MULTIPLIER',
          overtimeValue: employee.overtimeValue || 1.5,
          passportNumber: employee.passportNumber || '',
          passportExpiry: employee.passportExpiry ? new Date(employee.passportExpiry).toISOString().split('T')[0] : '',
          passportIssue: employee.passportIssue ? new Date(employee.passportIssue).toISOString().split('T')[0] : '',
          dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : '',
          avatar: employee.avatar ? (employee.avatar.startsWith('http') ? employee.avatar : `${API_URL}${employee.avatar}`) : null,
          cvPath: employee.cvPath ? `${API_URL}${employee.cvPath}` : null,
          idDocPath: employee.idDocPath ? `${API_URL}${employee.idDocPath}` : null
        });
        setEnrollmentComplete(employee.isBiometricEnrolled);
      } catch (err) {
        console.error("Load failed:", err);
        setError("Failed to synchronize workforce intelligence.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'cv' | 'idDoc') => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [field]: file }));
      if (field === 'avatar') {
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: reader.result as string }));
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && key !== 'avatar' && key !== 'cvPath' && key !== 'idDocPath') {
          data.append(key, value.toString());
        }
      });

      if (files.avatar) data.append('avatar', files.avatar);
      if (files.cv) data.append('cv', files.cv);
      if (files.idDoc) data.append('idDoc', files.idDoc);

      await updateEmployee(id!, data);
      setSuccess(true);
      setTimeout(() => navigate(`/employees/${id}`), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to finalize manifest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollBiometric = async () => {
    setIsEnrolling(true);
    // High-fidelity scanning simulation
    await new Promise(resolve => setTimeout(resolve, 3500));
    
    try {
      const dummyDescriptor = Array.from({ length: 128 }, () => Math.random());
      await enrollBiometric(id!, dummyDescriptor);
      setEnrollmentComplete(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Biometric enrollment failed.");
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return <div className="loading-state-premium"><div className="spinner-obsidian"></div><p>Synchronizing Identity...</p></div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="complete-profile-page"
    >
      <header className="page-header">
        <div className="header-main">
          <div>
            <h1>Workforce Identity Manifest</h1>
            <p>Configure legal documentation and high-fidelity biometric access.</p>
          </div>
          <button className="back-link-premium" onClick={() => navigate(-1)}>
            Back <ChevronLeft size={20} />
          </button>
        </div>
      </header>

      {success ? (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="success-overlay">
          <CheckCircle size={64} color="var(--primary)" />
          <h2>Identity Synchronized</h2>
          <p>The workforce manifest has been updated successfully. Redirecting...</p>
        </motion.div>
      ) : (
        <div className="form-grid-layout">
          {/* Main Identity Section */}
          <div className="form-column main-data">
            <div className="glass-card form-section-card">
              <form onSubmit={handleSubmit} className="premium-form">
                {error && <div className="error-banner"><AlertCircle size={18} /><span>{error}</span></div>}

                <div className="form-section">
                  <div className="section-header"><User size={20} /><h3>Core Identity</h3></div>
                  <div className="avatar-edit-site">
                    <div className="avatar-preview-lg">
                      {formData.avatar ? <img src={formData.avatar} alt="" /> : <User size={48} />}
                      <label htmlFor="avatar-upload" className="upload-badge"><Camera size={18} /></label>
                    </div>
                    <input id="avatar-upload" type="file" hidden onChange={(e) => handleFileChange(e, 'avatar')} />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Employee ID</label>
                      <input type="text" value={formData.employeeId} readOnly className="read-only-input" />
                    </div>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-header"><CreditCard size={20} /><h3>Professional Parameters</h3></div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Designation</label>
                      <input type="text" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Hourly Rate (₫)</label>
                      <input 
                        type="number" 
                        value={formData.hourlyRate || ''} 
                        onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions-compact">
                  <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Save Profile Details"}
                    <Save size={18} />
                  </button>

                </div>
              </form>
            </div>
          </div>

          {/* Secondary Info Column */}
          <div className="form-column side-data">
            {/* Biometric Enrollment Card */}
            <div className="glass-card form-section-card biometric-card">
              <div className="section-header"><ShieldCheck size={20} /><h3>Biometric Access</h3></div>
              <div className="biometric-site">
                <div className={`biometric-visual ${enrollmentComplete ? 'active' : ''} ${isEnrolling ? 'scanning' : ''}`}>
                  {isEnrolling ? (
                    <div className="scanner-simulation">
                      <div className="scan-bar"></div>
                      <Fingerprint size={64} className="faint-icon" />
                    </div>
                  ) : enrollmentComplete ? (
                    <ShieldCheck size={64} color="var(--primary)" />
                  ) : (
                    <Fingerprint size={64} color="var(--text-tertiary)" />
                  )}
                </div>
                
                <div className="biometric-details">
                  <h4>Facial ID Node</h4>
                  <p>{enrollmentComplete ? "Biometric signature synchronized." : "Requires 3D facial scan for secure site authentication."}</p>
                  
                  {!enrollmentComplete && (
                    <button 
                      className={`btn btn-secondary w-full ${isEnrolling ? 'loading' : ''}`}
                      onClick={handleEnrollBiometric}
                      disabled={isEnrolling}
                    >
                      {isEnrolling ? "Synchronizing Face Map..." : "Initialize 3D Scan"}
                    </button>
                  )}
                  
                  {enrollmentComplete && (
                    <div className="verified-badge-premium">
                      <CheckCircle size={14} /> Verified Signature
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Card */}
            <div className="glass-card form-section-card document-card" style={{ marginTop: '1.5rem' }}>
              <div className="section-header"><FileText size={20} /><h3>Legal Documents</h3></div>
              <div className="document-upload-grid">
                <div className="upload-node">
                  <label>Resume / Professional CV</label>

                  <div className="upload-box-premium">
                    <Upload size={20} />
                    <span>{files.cv ? files.cv.name : (formData.cvPath ? 'CV.pdf' : 'Upload CV')}</span>
                    <input type="file" onChange={(e) => handleFileChange(e, 'cv')} />
                  </div>
                </div>
                <div className="upload-node" style={{ marginTop: '1rem' }}>
                  <label>ID Proof / Passport Copy</label>

                  <div className="upload-box-premium">
                    <Upload size={20} />
                    <span>{files.idDoc ? files.idDoc.name : (formData.idDocPath ? 'ID_DOC.jpg' : 'Upload ID')}</span>
                    <input type="file" onChange={(e) => handleFileChange(e, 'idDoc')} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CompleteProfile;
