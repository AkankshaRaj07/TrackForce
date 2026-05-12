import { AnimatePresence } from 'framer-motion';

import { 
  Search, 
  UserPlus, 
  Download,
  Edit3,
  XCircle,
  Eye,
} from 'lucide-react';

import './Employees.css';

import { useEffect, useState } from 'react';
import { fetchEmployees, deleteEmployee, fetchSites } from '../api/api';

import { exportToCSV } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import PremiumSelect from '../components/PremiumSelect';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Employees = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [hubs, setHubs] = useState<any[]>([]);
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  
  const [toasts, setToasts] = useState<any[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadEmployees();
    loadHubs();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(emp => {
      const nameMatch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = searchTerm === '' || nameMatch || idMatch;
      const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
      const matchesSite = siteFilter === 'ALL' || emp.siteId === siteFilter;
      return matchesSearch && matchesRole && matchesSite;
    });
    setFilteredEmployees(filtered);
  }, [searchTerm, roleFilter, siteFilter, employees]);

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

  const loadHubs = async () => {
    try {
      const data = await fetchSites();
      setHubs(data);
    } catch (err) {
      console.error('Failed to load hubs');
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
          <button className="btn btn-ghost" onClick={() => exportToCSV(filteredEmployees, `Workforce_Master_${new Date().toISOString().split('T')[0]}`)}>
            <Download size={18} /> Export Ledger
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => navigate('/employees/add')}>
              <UserPlus size={18} /> Add New Identity
            </button>
          )}
        </div>
      </header>

      <div className="employees-toolbar-premium">
        <div className="search-bar-premium">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search identity ledger..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-hub-premium">
          <PremiumSelect 
            placeholder="Filter Role"
            value={roleFilter}
            onChange={(val: string) => setRoleFilter(val)}
            options={[
              { label: 'All Roles', value: 'ALL' },
              { label: 'Admin', value: 'ADMIN' },
              { label: 'Manager', value: 'MANAGER' },
              { label: 'Employee', value: 'EMPLOYEE' }
            ]}
            className="filter-dropdown"
          />
          <PremiumSelect 
            placeholder="Filter Hub"
            value={siteFilter}
            onChange={(val: string) => setSiteFilter(val)}
            options={[
              { label: 'All Hubs', value: 'ALL' },
              ...hubs.map(hub => ({ label: hub.name, value: hub.id }))
            ]}
            className="filter-dropdown"
          />
        </div>
      </div>

      <div className="glass-card table-container-premium">
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Login ID</th>
              <th>Phone Number</th>
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
                      {emp.avatar ? (
                        <img 
                          src={emp.avatar.startsWith('http') ? emp.avatar : `${API_URL}${emp.avatar}`} 
                          alt="" 
                        />
                      ) : (
                        emp.firstName.charAt(0)
                      )}
                    </div>
                    <div className="name-stack">
                      <span className="full-name">{emp.firstName} {emp.lastName}</span>
                      <span className="designation">{emp.designation || 'Specialist'}</span>
                    </div>
                  </div>
                </td>
                <td><span className="mono-badge">{emp.employeeId}</span></td>
                <td><span className="email-text">{emp.phone || 'N/A'}</span></td>
                <td>
                  <div className="role-status">
                    <span className="role-tag">{emp.role}</span>
                    <span className={`status-dot ${emp.status.toLowerCase()}`}></span>
                  </div>
                </td>
                <td>{emp.site?.name || 'Unassigned'}</td>
                <td>
                  <div className="action-row">
                    <button className="action-icon-btn" onClick={() => navigate(`/employees/${emp.id}`)} title="View Node Details">
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
