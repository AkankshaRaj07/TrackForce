import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  TrendingUp, 
  Download, 
  FileText,
  CreditCard,
  Wallet,
  ArrowUpRight,
  Search,
  CheckCircle2,
  RefreshCw,
  Printer,
  Activity
} from 'lucide-react';
import { fetchPayroll, processPayroll, fetchPayrollStats } from '../api/api';
import { exportToCSV } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import PayslipModal from '../components/PayslipModal';
import './Payroll.css';

const StatCard = ({ icon, label, value, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card stat-card-premium"
  >
    <div className="stat-icon-wrap" style={{ color }}>
      {icon}
    </div>
    <div className="stat-content">
      <p className="stat-label">{label}</p>
      <h3 className="stat-value">{value}</h3>
    </div>
    <div className="stat-trend positive">
      <ArrowUpRight size={14} />
      <span>+12.5%</span>
    </div>
  </motion.div>
);

const Payroll = () => {
  const { user, isAdmin } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toasts, setToasts] = useState<any[]>([]);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadPayrollData();
  }, []);

  const loadPayrollData = async () => {
    try {
      const [data, statsData] = await Promise.all([
        fetchPayroll(),
        fetchPayrollStats()
      ]);
      setPayrollData(data);
      setStats(statsData);
    } catch (err) {
      addToast('Failed to load payroll intelligence', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    setIsProcessing(true);
    try {
      await processPayroll();
      addToast('Payments processed successfully!', 'success');
      loadPayrollData();
    } catch (err) {
      addToast('Failed to process payments', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    exportToCSV(payrollData, 'Payroll_Registry');
    addToast('Report generated successfully', 'success');
  };

  if (loading) return <div className="loading-state">Synchronizing Financial Nodes...</div>;

  const filteredData = payrollData.filter(item => 
    `${item.employee?.firstName} ${item.employee?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="payroll-page">
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
            {isEmployee ? 'Personal Earnings Vault' : 'Financial Intelligence'}
          </motion.h1>
          <p>{isEmployee ? 'Review your historical payouts and generated payslips.' : 'Managed payroll cycles and automated fund distributions.'}</p>
        </div>
        <div className="header-actions">
          {!isEmployee && (
            <button className="btn btn-ghost" onClick={handleExport}>
              <Download size={18} /> Export Registry
            </button>
          )}
          {isAdmin && (
            <button 
              className="btn btn-primary" 
              onClick={handleProcessPayroll}
              disabled={isProcessing}
            >
              {isProcessing ? <RefreshCwIcon className="spin" size={18} /> : <CreditCard size={18} />}
              Process All Payments
            </button>
          )}
        </div>
      </header>

      <div className="stats-grid-premium">
        <StatCard 
          icon={<Wallet size={24} />} 
          label={isEmployee ? "Total Earned" : "Total Payouts"} 
          value={`${stats?.totalPayout?.toLocaleString() || '0'} ₫`}
          color="#f59e0b"
        />
        <StatCard 
          icon={<Clock size={24} />} 
          label="Cumulative Hours" 
          value={`${stats?.totalHours || '0.0'}h`}
          color="#6366f1"
        />
        {isEmployee ? (
          <StatCard 
            icon={<CheckCircle2 size={24} />} 
            label="Verification Status" 
            value="Identity Verified"
            color="#10b981"
          />
        ) : (
          <StatCard 
            icon={<TrendingUp size={24} />} 
            label="Active Recipients" 
            value={stats?.activeRecipients || '0'}
            color="#10b981"
          />
        )}
        <StatCard 
          icon={<Activity size={24} />} 
          label="Ledger Status" 
          value="Synchronized"
          color="#10b981"
        />
      </div>

      {!isEmployee && (
        <div className="glass-card table-controls">
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search recipients..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="glass-card table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              {isEmployee ? <th>Period</th> : <th>Employee</th>}
              {!isEmployee && <th>Period</th>}
              <th>Regular Hours</th>
              <th>Overtime</th>
              <th>Gross Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                {isEmployee ? (
                   <td data-label="Period">
                    {item.periodStart ? new Date(item.periodStart).toLocaleDateString() : 'Current'} - {item.periodEnd ? new Date(item.periodEnd).toLocaleDateString() : 'Period'}
                   </td>
                ) : (
                  <td className="emp-cell">
                    <span>{item.employee?.firstName || 'Unknown'} {item.employee?.lastName || ''}</span>
                  </td>
                )}
                {!isEmployee && (
                  <td data-label="Period">
                    {item.periodStart ? new Date(item.periodStart).toLocaleDateString() : 'Current'} - {item.periodEnd ? new Date(item.periodEnd).toLocaleDateString() : 'Period'}
                  </td>
                )}
                <td data-label="Regular Hours">{item.regularHours || '0.0'} hrs</td>
                <td data-label="Overtime">{item.overtimeHours || '0.00'} hrs</td>
                <td data-label="Gross Amount" className="amount-cell">
                  {(item.earnings || 0).toLocaleString()} ₫
                </td>
                <td data-label="Status">
                  <span className={`badge badge-${(item.status || 'PENDING').toLowerCase()}`}>
                    {item.status || 'PENDING'}
                  </span>
                </td>
                <td data-label="Action">
                  <div className="action-row-mini">
                    <button 
                      className="icon-btn highlight" 
                      title="View Payslip"
                      onClick={() => {
                        setSelectedPayslip(item);
                        setIsPayslipOpen(true);
                      }}
                    >
                      {isEmployee ? <FileText size={16} /> : <Printer size={16} />}
                      {isEmployee && <span style={{ marginLeft: '6px', fontSize: '12px' }}>View Payslip</span>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PayslipModal 
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        data={selectedPayslip}
      />
    </div>
  );
};

const RefreshCwIcon = ({ className, size }: any) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
  >
    <RefreshCw className={className} size={size} />
  </motion.div>
);

export default Payroll;
