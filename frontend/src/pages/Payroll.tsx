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
import { fetchPayroll, processPayroll, fetchPayrollStats, generatePayslip } from '../api/api';
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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [toasts, setToasts] = useState<any[]>([]);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadPayrollData();
    const interval = setInterval(loadPayrollData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
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

  const handleGeneratePayslip = async (employeeId: string) => {
    setGeneratingIds(prev => {
      const next = new Set(prev);
      next.add(employeeId);
      return next;
    });
    try {
      await generatePayslip(employeeId);
      addToast('Payslip generated successfully!', 'success');
      loadPayrollData();
    } catch (err) {
      addToast('Failed to generate payslip', 'error');
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(employeeId);
        return next;
      });
    }
  };

  const handleExport = () => {
    exportToCSV(payrollData, 'Payroll_Registry');
    addToast('Report generated successfully', 'success');
  };

  if (loading) return <div className="loading-state">Synchronizing Financial Nodes...</div>;

  const filteredData = payrollData.filter(item => {
    const matchesSearch = `${item.employee?.firstName} ${item.employee?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesMonth = true;
    if (selectedMonth && item.periodStart) {
      const itemDate = new Date(item.periodStart);
      const itemMonthStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      matchesMonth = itemMonthStr === selectedMonth;
    }
    
    return matchesSearch && matchesMonth;
  });

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
          label={isEmployee ? "Payment Status" : "Ledger Status"} 
          value={isEmployee ? "Up to date" : "Synchronized"}
          color="#10b981"
        />
      </div>

      <div className="table-controls" style={{ justifyContent: isEmployee ? 'flex-end' : 'space-between' }}>
        {!isEmployee && (
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search recipients..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
        <div className="month-filter-wrap">
          <input 
            type="month" 
            className="month-picker-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            title="Filter by Month"
          />
        </div>
      </div>

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
                    {isEmployee ? (
                      item.status === 'PAID' ? (
                        <button 
                          className="btn btn-primary" 
                          title="View Payslip"
                          style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => {
                            setSelectedPayslip(item);
                            setIsPayslipOpen(true);
                          }}
                        >
                          <FileText size={16} />
                          <span>View Payslip</span>
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '11px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)', cursor: 'not-allowed' }} title="Payslip has not been generated by admin yet.">
                          <Clock size={12} style={{ color: 'var(--warning)' }} />
                          <span>Pending Release</span>
                        </div>
                      )
                    ) : (
                      item.status === 'PAID' ? (
                        <button 
                          className="btn-view-slip" 
                          title="View Payslip"
                          onClick={() => {
                            setSelectedPayslip(item);
                            setIsPayslipOpen(true);
                          }}
                        >
                          <Printer size={12} />
                          <span>View Slip</span>
                        </button>
                      ) : (
                        <button 
                          className="btn-generate" 
                          disabled={generatingIds.has(item.id)}
                          onClick={() => handleGeneratePayslip(item.id)}
                        >
                          {generatingIds.has(item.id) ? (
                            <RefreshCw className="spin" size={12} />
                          ) : (
                            <FileText size={12} />
                          )}
                          <span>Generate</span>
                        </button>
                      )
                    )}
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
