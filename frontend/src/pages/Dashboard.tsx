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

const StatCard = ({ icon, label, value, trend, color, description }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="glass-card command-card"
    style={{ '--card-accent': color } as any}
  >
    <div className="card-glow"></div>
    <div className="card-content-elite">
      <div className="icon-badge-premium">
        {icon}
      </div>
      <div className="stat-data">
        <h2 className="stat-value-elite">{value}</h2>
        <span className="stat-label-elite">{label}</span>
      </div>
      {trend !== undefined && (
        <div className={`trend-pill ${trend > 0 ? 'positive' : 'negative'}`}>
          {trend > 0 ? <TrendingUp size={12} /> : <TrendingUp size={12} style={{ transform: 'rotate(90deg)' }} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    {description && <p className="card-description-elite">{description}</p>}
  </motion.div>
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  const avatarSrc = user?.avatar 
    ? (user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`) 
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName || 'User'}`;

  return (
    <div className="dashboard-container-elite">
      <header className="command-header">
        <div className="identity-section">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="user-avatar-elite"
          >
            <img src={avatarSrc} alt="" />
            <div className="status-ring"></div>
          </motion.div>
          <div className="welcome-text">
            <h1>{t('welcomeBack')}, {user?.firstName}</h1>
            <div className="role-chip">
              <Activity size={12} />
              <span>{user?.role} STATUS: OPTIMIZED</span>
            </div>
          </div>
        </div>
        
        <div className="action-hub-elite">
          {isManagement && (
            <button className="btn btn-secondary-elite" onClick={handleExport}>
              <CheckCircle2 size={16} /> {t('exportReport')}
            </button>
          )}
          <button className="btn btn-primary-elite" onClick={() => isManagement ? navigate('/sites') : navigate('/attendance')}>
            {isManagement ? t('manageSites') : "Go to Terminal"}
          </button>
        </div>
      </header>

      <div className="hero-insight-banner">
        <div className="insight-content">
          <div className="insight-icon">
            <Activity size={32} />
          </div>
          <div className="insight-text">
            <h3>Operational Overview</h3>
            <p>{isManagement ? "Workforce efficiency is up 12% this week across all active sites." : "You've achieved 98% attendance accuracy this month. Keep it up!"}</p>
          </div>
        </div>
        <div className="insight-visual">
          <div className="pulse-circle"></div>
          <div className="pulse-circle delay-1"></div>
        </div>
      </div>

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

      <section className="intelligence-grid">
        <StatCard
          icon={<Users size={20} />}
          label={isManagement ? t('totalWorkforce') : t('myWeeklyHours')}
          value={isManagement ? (stats?.totalEmployees || 0) : (stats?.weeklyHours || "0.0")}
          trend={12.5}
          color="#568F87"
          description={isManagement ? "Active personnel across all sectors" : "Total logged duration this period"}
        />
        <StatCard
          icon={<Activity size={20} />}
          label={isManagement ? t('currentAttendance') : t('myEfficiency')}
          value={isManagement ? `${stats?.activeNow || 0}` : `${stats?.efficiency || 0}%`}
          trend={3.2}
          color="#F5BABB"
          description={isManagement ? "Employees currently on-site" : "Relative productivity score"}
        />
        <StatCard
          icon={<MapPin size={20} />}
          label={isManagement ? t('operationalSites') : t('activeSite')}
          value={isManagement ? (stats?.sites || 0) : (stats?.activeSite || user?.site?.name || 'Assigned Site')}
          color="#568F87"
          description={isManagement ? "Active geofenced locations" : "Your current base of operations"}
        />
        <StatCard
          icon={<Clock size={20} />}
          label={isManagement ? t('avgShiftDuration') : t('totalEarnings')}
          value={isManagement ? `${stats?.avgShift || 0}h` : `${(stats?.earnings || 0).toLocaleString()} ₫`}
          trend={-1.2}
          color="#F5BABB"
          description={isManagement ? "Mean time per operational cycle" : "Estimated payout for active period"}
        />
      </section>

      {isManagement ? (
      <div className="intelligence-main-grid">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card metrics-chart-card"
        >
          <div className="card-header-elite">
            <div className="title-group">
              <TrendingUp size={18} className="header-icon" />
              <h3>Attendance Trajectory</h3>
            </div>
          </div>
          <div className="chart-wrapper-premium">
            <div className="vertical-axis-label">Active Capacity</div>
            <div className="chart-container-elite">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 40 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#568F87" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#568F87" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-dim)', fontSize: 10}} angle={-90} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-dim)', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ background: '#064232', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#F5BABB' }}
                />
                <Area type="monotone" dataKey="attendance" stroke="#568F87" fillOpacity={1} fill="url(#colorAttendance)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card site-performance-card"
        >
          <div className="card-header-elite">
            <div className="title-group">
              <Activity size={18} className="header-icon" />
              <h3>Site Operations</h3>
            </div>
          </div>
          <div className="site-ops-list">
            {(stats?.sitePerformance || []).length > 0 ? (stats?.sitePerformance || []).map((site: any, idx: number) => (
              <div key={idx} className="site-op-item">
                <div className="site-op-header">
                  <span className="site-op-name">{site.name}</span>
                  <span className="site-op-status">{site.count} ACTIVE</span>
                </div>
                <div className="site-op-progress">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(site.count * 10, 100)}%` }}
                    className="site-op-fill"
                  ></motion.div>
                </div>
              </div>
            )) : (
              <div className="empty-state-elite">No active site data available</div>
            )}
          </div>
        </motion.div>
      </div>
      ) : (
        <div className="intelligence-main-grid">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card metrics-chart-card"
          >
          <div className="card-header-elite">
            <div className="title-group">
              <TrendingUp size={18} className="header-icon" />
              <h3>Personal Progress</h3>
            </div>
          </div>
          <div className="chart-wrapper-premium">
            <div className="vertical-axis-label">Performance Metric</div>
            <div className="chart-container-elite">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorPersonal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5BABB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F5BABB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-dim)', fontSize: 10}} angle={-90} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-dim)', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ background: '#064232', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#F5BABB' }}
                  />
                  <Area type="monotone" dataKey="attendance" stroke="#F5BABB" fillOpacity={1} fill="url(#colorPersonal)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card site-performance-card"
          >
            <div className="card-header-elite">
              <div className="title-group">
                <Activity size={18} className="header-icon" />
                <h3>Recent Activity</h3>
              </div>
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
                <div className="empty-state-elite">No recent activity detected</div>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};



export default Dashboard;
