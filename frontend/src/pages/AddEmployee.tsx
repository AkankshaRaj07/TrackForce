import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Briefcase, 
  Camera, 
  Lock, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  UserPlus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchSites, createEmployee, fetchEmployeeById, updateEmployee } from '../api/api';
import './AddEmployee.css';

const AddEmployee = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hubs, setHubs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    designation: '',
    role: 'EMPLOYEE',
    siteId: '',
    avatar: null as string | null
  });

  useEffect(() => {
    const initPage = async () => {
      try {
        const sites = await fetchSites();
        setHubs(sites);

        if (isEditMode) {
          const emp = await fetchEmployeeById(id);
          setFormData({
            employeeId: emp.employeeId || '',
            firstName: emp.firstName || '',
            lastName: emp.lastName || '',
            email: emp.email || '',
            password: '', // Leave blank for edit
            designation: emp.designation || '',
            role: emp.role || 'EMPLOYEE',
            siteId: emp.siteId || '',
            avatar: emp.avatar || null
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditMode) {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete (updateData as any).password;
        }
        await updateEmployee(id, updateData);
      } else {
        await createEmployee(formData);
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
          <button className="btn-icon-ghost" onClick={() => navigate('/employees')}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1>{isEditMode ? "Edit Employee Profile" : "Add New Workforce Member"}</h1>
            <p>{isEditMode ? "Modify existing workforce data and biometric access levels." : "Set up a new workforce member with biometric access."}</p>
          </div>
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
            
            <div className="avatar-upload-premium">
              <div className="avatar-preview-lg">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Preview" />
                ) : (
                  <User size={48} />
                )}
                <label htmlFor="avatar-page-upload" className="upload-badge-lg">
                  <Camera size={20} />
                </label>
              </div>
              <input 
                id="avatar-page-upload"
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <div className="upload-text">
                <h4>Profile Picture</h4>
                <p>Upload a high-quality photo for identification</p>
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label>Employee ID (Login ID)</label>
                <input 
                  type="text" 
                  required 
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  placeholder="e.g. TF001" 
                />
              </div>
              <div className="form-group">
                <label>First Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="John" 
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Doe" 
                />
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
                <label>Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john.doe@trackforce.com" 
                />
              </div>
              <div className="form-group">
                <label>{isEditMode ? "New Password (Leave blank to keep current)" : "Initial Password"}</label>
                <input 
                  type="password" 
                  required={!isEditMode}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••" 
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <Briefcase size={20} />
              <h3>Assignment & Role</h3>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Designation</label>
                <input 
                  type="text" 
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  placeholder="Security Officer" 
                />
              </div>
              <div className="form-group">
                <label>Access Level</label>
                {isAdmin ? (
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="EMPLOYEE">Standard Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                ) : (
                  <select disabled value="EMPLOYEE">
                    <option value="EMPLOYEE">Standard Employee</option>
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Default Assignment</label>
                <select 
                  required
                  value={formData.siteId}
                  onChange={(e) => setFormData({...formData, siteId: e.target.value})}
                >
                  <option value="">Select a hub...</option>
                  {hubs.map(hub => (
                    <option key={hub.id} value={hub.id}>{hub.name}</option>
                  ))}
                </select>
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
