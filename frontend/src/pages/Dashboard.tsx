import { motion } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  Clock, 
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { exportToCSV } from '../utils/export';
import './Dashboard.css';

import { useEffect, useState } from 'react';
import { fetchStats } from '../api/api';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ icon, label, value, trend, color }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className="glass-card stat-card-premium"
    style={{ '--accent-color': color } as any}
  >
    <div className="stat-card-glow"></div>
    <div className="stat-icon-wrapper">
      {icon}
    </div>
    <div className="stat-info">
      <span className="stat-label">{label}</span>
      <h2 className="stat-value">{value}</h2>
      {trend && (
        <span className={`stat-trend ${trend > 0 ? 'up' : 'down'}`}>
          {trend > 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} style={{ transform: 'rotate(90deg)' }} />}
          {trend}% vs last month
        </span>
      )}
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchStats().then(setStats).catch(console.error);
  }, []);

  const handleExport = () => {
    exportToCSV([stats], 'Dashboard_Stats');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isManagement = isAdmin || isManager;

  const chartData = stats?.weeklyTrend || [];

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header-premium">
        <div className="header-text">
          <h1>
            {isAdmin ? t('workforceIntelligence') : isManager ? t('hubOperations') : t('myPerformance')}
          </h1>
          <p>
            {isAdmin 
              ? t('adminDashboardSubtext') 
              : isManager 
                ? t('managerDashboardSubtext') 
                : t('employeeDashboardSubtext')}
          </p>
        </div>
        <div className="header-actions">
          {isManagement && <button className="btn btn-ghost" onClick={handleExport}>{t('exportReport')}</button>}
          <button className="btn btn-primary" onClick={() => isManagement ? navigate('/settings') : navigate('/attendance')}>
            {isManagement ? t('configuration') : "Clock In / Out"}
          </button>
        </div>
      </header>
      
      {!isManagement && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`security-status-banner ${user?.isBiometricEnrolled ? 'verified' : 'unverified'}`}
        >
          <div className="banner-content">
            <CheckCircle2 size={18} className="shield-icon" />
            <div>
              <strong>{user?.isBiometricEnrolled ? "Biometric Security Active" : "Action Required: Biometric Enrollment"}</strong>
              <p>{user?.isBiometricEnrolled 
                ? "Your identity is protected by facial recognition protocols." 
                : "Complete enrollment in the Attendance section to secure your account."}
              </p>
            </div>
          </div>
          {!user?.isBiometricEnrolled && (
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/attendance')}>
              Enroll Now
            </button>
          )}
        </motion.div>
      )}

      <section className="stats-grid-premium">
        <StatCard 
          icon={<Users size={24} />} 
          label={isManagement ? t('totalWorkforce') : t('myWeeklyHours')} 
          value={isManagement ? (stats?.totalEmployees || 0) : (stats?.weeklyHours || "0.0")} 
          trend={12.5} 
          color="var(--accent)" 
        />
        <StatCard 
          icon={<Activity size={24} />} 
          label={isManagement ? t('currentAttendance') : t('myEfficiency')} 
          value={isManagement ? `${stats?.activeNow || 0}` : `${stats?.efficiency || 0}%`} 
          trend={3.2} 
          color="var(--primary)" 
        />
        <StatCard 
          icon={<MapPin size={24} />} 
          label={isManagement ? t('operationalSites') : t('activeSite')} 
          value={isManagement ? (stats?.sites || 0) : (stats?.activeSite || user?.site?.name || 'Assigned Site')} 
          color="var(--accent)" 
        />
        <StatCard 
          icon={<Clock size={24} />} 
          label={isManagement ? t('avgShiftDuration') : t('totalEarnings')} 
          value={isManagement ? `${stats?.avgShift || 0}h` : `$${stats?.earnings || "0.00"}`} 
          trend={-1.2} 
          color="var(--primary)" 
        />
      </section>

      {isManagement ? (
        <div className="main-content-grid">
          <div className="glass-card main-chart">
            <div className="card-header">
              <h3>{t('attendanceEfficiency')}</h3>
              <div className="chart-legend">
                <span className="dot"></span> {t('activeNow')} ({stats?.activeNow})
              </div>
            </div>
            <div className="chart-h-400">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="var(--text-secondary)" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  />
                  <Area type="monotone" dataKey="attendance" stroke="var(--primary)" fill="url(#chartGradient)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card side-list">
            <div className="card-header">
              <h3>{t('hubPerformance')}</h3>
            </div>
            <div className="performance-list">
              {(stats?.sitePerformance || []).map((site: any, idx: number) => (
                <div key={idx} className="performance-item">
                  <div className="hub-info">
                    <span className="hub-name">{site.name}</span>
                    <div className="progress-bar-premium">
                      <div className="progress-fill-premium" style={{ width: `${Math.min(site.count * 10, 100)}%` }}></div>
                    </div>
                  </div>
                  <span className="hub-value">{site.count} Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content-grid">
          <div className="glass-card main-chart">
            <div className="card-header">
              <h3>{t('myWeeklyProgress')}</h3>
            </div>
            <div className="chart-h-400">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-dim)" axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-dim)" axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="attendance" stroke="var(--primary)" fill="rgba(245, 158, 11, 0.1)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card side-list">
            <div className="card-header">
              <h3>Recent System Events</h3>
            </div>
            <div className="notifications-list-premium">
              {(stats?.recentLogs || []).length > 0 ? (
                stats.recentLogs.map((log: any, idx: number) => (
                  <div key={idx} className="notification-item-premium">
                    <div className={`n-icon ${log.type === 'ALERT' ? 'alert' : 'approved'}`}>
                      {log.type === 'ALERT' ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div className="n-text">
                      <strong>{log.title}</strong>
                      <p>{log.message}</p>
                      <span>{new Date(log.time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state-simple">No recent events logged.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};



export default Dashboard;
