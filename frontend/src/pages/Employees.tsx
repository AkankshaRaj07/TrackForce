import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  UserPlus, 
  Filter,
  Download,
  CheckCircle2,
  Shield,
  Edit3,
  XCircle,
  Eye,
  Lock,
  Mail,
  Smartphone,
  MapPin,
  Calendar,
  X
} from 'lucide-react';
import './Employees.css';

import { useEffect, useState } from 'react';
import { fetchEmployees, deleteEmployee, updateEmployee } from '../api/api';
import { exportToCSV } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';

const Employees = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const isManagement = isAdmin;
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [toasts, setToasts] = useState<any[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(emp => 
      `${emp.firstName} ${emp.lastName} ${emp.employeeId} ${emp.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const loadEmployees = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (err) {
      addToast('Failed to load workforce', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployeeToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployee(employeeToDelete);
      setEmployees(employees.filter(emp => emp.id !== employeeToDelete));
      addToast('Employee record purged successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete employee', 'error');
    } finally {
      setIsConfirmOpen(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedEmployee || !newPassword) return;
    try {
      await updateEmployee(selectedEmployee.id, { password: newPassword });
      addToast(`Password for ${selectedEmployee.firstName} reset successfully!`, 'success');
      setIsResetting(false);
      setNewPassword('');
    } catch (err) {
      addToast('Failed to reset credential node', 'error');
    }
  };

  if (loading) return <div className="loading-state">Decrypting Workforce Ledger...</div>;

  return (
    <div className="employees-container">
      <div className="premium-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      <header className="glass-card profile-header" style={{ marginBottom: '24px' }}>
        <div className="header-content">
          <h1>Workforce Intelligence</h1>
          <p>Master ledger of all active identity nodes and security parameters.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => exportToCSV(employees, 'Workforce_Master')}>
            <Download size={18} /> Export Ledger
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => navigate('/employees/add')}>
              <UserPlus size={18} /> Add New Identity
            </button>
          )}
        </div>
      </header>

      <div className="glass-card table-controls" style={{ marginBottom: '24px', padding: '16px 24px' }}>
        <div className="search-bar">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search by name, ID, email or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card table-container" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Login ID</th>
              <th>Email Address</th>
              <th>Role & Status</th>
              <th>Hub</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="emp-identity">
                    <div className="avatar-small">
                      {emp.avatar ? <img src={emp.avatar} alt="" /> : emp.firstName.charAt(0)}
                    </div>
                    <div className="name-stack">
                      <span className="full-name">{emp.firstName} {emp.lastName}</span>
                      <span className="designation">{emp.designation || 'Specialist'}</span>
                    </div>
                  </div>
                </td>
                <td><span className="mono-badge">{emp.employeeId}</span></td>
                <td><span className="email-text">{emp.email}</span></td>
                <td>
                  <div className="role-status">
                    <span className="role-tag">{emp.role}</span>
                    <span className={`status-dot ${emp.status.toLowerCase()}`}></span>
                  </div>
                </td>
                <td>{emp.site?.name || 'Unassigned'}</td>
                <td>
                  <div className="action-row">
                    <button className="action-icon-btn" onClick={() => setSelectedEmployee(emp)} title="View Node Details">
                      <Eye size={18} />
                    </button>
                    {isAdmin && (
                      <button className="action-icon-btn" onClick={() => navigate(`/employees/edit/${emp.id}`)} title="Edit Configuration">
                        <Edit3 size={18} />
                      </button>
                    )}
                    {isAdmin && (
                      <button className="action-icon-btn danger" onClick={() => handleDeleteEmployee(emp.id)} title="Decommission Node">
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Identity Detail Modal */}
      <AnimatePresence>
        {selectedEmployee && (
          <div className="proof-modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card scanner-modal-obsidian identity-detail-modal"
              style={{ maxWidth: '600px', width: '100%' }}
            >
              <div className="modal-header-premium">
                <h3>Identity Node: {selectedEmployee.employeeId}</h3>
                <button className="close-btn-premium" onClick={() => { setSelectedEmployee(null); setIsResetting(false); }}><X size={20} /></button>
              </div>

              <div className="identity-deep-view" style={{ padding: '24px' }}>
                <div className="detail-hero">
                  <div className="hero-avatar">
                    {selectedEmployee.avatar ? <img src={selectedEmployee.avatar} alt="" /> : <div className="avatar-placeholder">{selectedEmployee.firstName.charAt(0)}</div>}
                  </div>
                  <div className="hero-text">
                    <h2>{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                    <span className="badge badge-admin">{selectedEmployee.role}</span>
                  </div>
                </div>

                <div className="detail-grid-premium" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
                  <div className="detail-item-premium">
                    <label><Mail size={14} /> Official Email</label>
                    <span>{selectedEmployee.email}</span>
                  </div>
                  <div className="detail-item-premium">
                    <label><Smartphone size={14} /> Contact Node</label>
                    <span>{selectedEmployee.phone || 'Not Configured'}</span>
                  </div>
                  <div className="detail-item-premium">
                    <label><MapPin size={14} /> Assigned Hub</label>
                    <span>{selectedEmployee.site?.name || 'Unassigned'}</span>
                  </div>
                  <div className="detail-item-premium">
                    <label><Calendar size={14} /> Join Date</label>
                    <span>{new Date(selectedEmployee.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="security-section-premium" style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={18} color="var(--primary)" /> Security Parameters
                  </h4>
                  <div className="security-stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="s-stat">
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Biometric Status</span>
                      <p style={{ margin: 0, fontWeight: 700, color: selectedEmployee.isBiometricEnrolled ? 'var(--success)' : 'var(--error)' }}>
                        {selectedEmployee.isBiometricEnrolled ? 'Verified & Enrolled' : 'Pending Enrollment'}
                      </p>
                    </div>
                    {isAdmin && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setIsResetting(!isResetting)}>
                        <Lock size={14} /> {isResetting ? 'Cancel Reset' : 'Force Password Reset'}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {isResetting && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginTop: '16px' }}
                      >
                        <div className="reset-form" style={{ display: 'flex', gap: '10px' }}>
                          <input 
                            type="text" 
                            placeholder="Enter new administrative password..." 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{ flex: 1, padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                          />
                          <button className="btn btn-primary" onClick={handlePasswordReset}>Commit Reset</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Decommission Identity Node"
        message="Are you sure you want to permanently delete this employee? All historical efficiency and attendance data will be purged."
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="Execute Purge"
        variant="danger"
      />
    </div>
  );
};

export default Employees;
