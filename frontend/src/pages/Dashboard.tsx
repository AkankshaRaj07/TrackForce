import { motion } from 'framer-motion';
import {
  Users,
  MapPin,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle2,
  Wallet
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

const StatCard = ({ icon, label, value, trend, color, description, trendLabel }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="watt-card stat-card"
  >
    <div className="stat-card-top">
      <div className="stat-icon-box" style={{ backgroundColor: `${color}15`, color: color }}>
        {icon}
      </div>
      {trend !== undefined && (
        <div className="stat-trend-badge" style={{ backgroundColor: trend > 0 ? '#10B98115' : '#EF444415', color: trend > 0 ? '#10B981' : '#EF4444' }}>
          <TrendingUp size={12} style={{ transform: trend > 0 ? 'none' : 'rotate(180deg)' }} />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
      {trendLabel && (
        <div className="stat-trend-label">
          {trendLabel}
        </div>
      )}
    </div>
    <div className="stat-card-content">
      <span className="stat-label">{label}</span>
      <div className="stat-value-group">
        <h2 className="stat-value">{value}</h2>
        {description && <span className="stat-unit">{description}</span>}
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isManagement = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const chartData = stats?.weeklyTrend || [];

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return isNaN(date.getTime()) ? timeStr : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeStr || '--:--';
    }
  };

  if (loading && !stats) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner-watt"></div>
        <p>Synchronizing Intelligence...</p>
      </div>
    );
  }

  if (!loading && !stats) {
    return (
      <div className="dashboard-watt">
        <header className="dashboard-header">
          <h1 className="page-title">System Overview</h1>
        </header>
        <div className="watt-card error-state">
          <Activity size={48} color="#EF4444" />
          <h3>Connectivity Interrupted</h3>
          <p>We're unable to sync with the intelligence grid. Please verify your credentials or network status.</p>
          <button className="watt-btn primary" onClick={() => window.location.reload()}>
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-watt">
      <header className="dashboard-header">
        <div className="header-titles">
          <h1 className="page-title">System Overview</h1>
          <p className="page-subtitle">Real-time intelligence from your workforce grid.</p>
        </div>
        <div className="header-actions">
          <button className="watt-btn secondary">
            <Clock size={18} />
            <span>Last 24 Hours</span>
          </button>
          <button className="watt-btn primary" onClick={() => stats && exportToCSV([stats], 'Dashboard_Stats')}>
            <CheckCircle2 size={18} />
            <span>Export Data</span>
          </button>
        </div>
      </header>

      <section className="stats-grid-watt">
        <StatCard
          icon={<Users size={20} />}
          label={isManagement ? "Total Workforce" : "Weekly Hours"}
          value={isManagement ? (stats?.totalEmployees ?? 0) : (stats?.weeklyHours ?? "0.0")}
          trend={4.2}
          color="#3B82F6"
          description={isManagement ? "" : "hours"}
        />
        <StatCard
          icon={<Activity size={20} />}
          label={isManagement ? "Active Now" : "Efficiency"}
          value={isManagement ? (stats?.activeNow ?? 0) : `${stats?.efficiency ?? 0}%`}
          trend={1.8}
          color="#10B981"
          description={isManagement ? "personnel" : ""}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Operational Efficiency"
          value="94.2"
          color="#F59E0B"
          description="%"
          trendLabel="Stable"
        />
        <StatCard
          icon={<Wallet size={20} />}
          label={isManagement ? "Est. Payroll" : "Total Earnings"}
          value={isManagement ? "42.5" : (stats?.earnings ?? 0).toLocaleString()}
          color="#8B5CF6"
          description={isManagement ? "k" : "₫"}
          trendLabel="Proj. $840"
        />
      </section>

      <div className="main-charts-grid">
        <div className="watt-card chart-main">
          <div className="card-header-watt">
            <h3 className="card-title">Workforce Activity Over Time</h3>
            <div className="chart-legend-watt">
              <span className="legend-item"><span className="dot active"></span> Active Load</span>
              <span className="legend-item"><span className="dot baseline"></span> Baseload</span>
            </div>
          </div>
          <div className="chart-wrapper-watt" style={{ minHeight: '320px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="wattBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748B', fontSize: 12, fontWeight: 500}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748B', fontSize: 12, fontWeight: 500}} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#wattBlue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart-state">No trend data available for this period.</div>
            )}
          </div>
        </div>

        <div className="watt-card asset-distribution">
          <div className="card-header-watt">
            <h3 className="card-title">Activity by Site</h3>
          </div>
          <div className="asset-list">
            {(stats?.sitePerformance || []).length > 0 ? (stats?.sitePerformance || []).map((site: any, idx: number) => (
              <div key={idx} className="asset-item">
                <div className="asset-info">
                  <span className="asset-name">{site.name}</span>
                  <span className="asset-value">{site.count} ACTIVE</span>
                </div>
                <div className="asset-progress-bg">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(site.count * 10, 100)}%` }}
                    className="asset-progress-fill"
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            )) : (
              <div className="empty-asset-state">No active site sessions detected.</div>
            )}
          </div>
        </div>
      </div>

      <div className="watt-card recent-events">
        <div className="card-header-watt">
          <h3 className="card-title">Recent Activity Logs</h3>
          <div className="header-controls">
            <button className="icon-btn-small"><TrendingUp size={16} /></button>
            <button className="icon-btn-small"><Clock size={16} /></button>
          </div>
        </div>
        <div className="events-table-wrapper">
          { (stats?.recentLogs || []).length > 0 ? (
          <table className="events-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>ENTITY</th>
                <th>EVENT TYPE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLogs.map((log: any, idx: number) => (
                <tr key={idx}>
                  <td className="timestamp">{formatTime(log.time)}</td>
                  <td className="entity">{log.title}</td>
                  <td className="event-type">{log.type}</td>
                  <td>
                    <span className={`status-pill ${log.type === 'ALERT' ? 'warning' : 'success'}`}>
                      {log.type === 'ALERT' ? 'Pending' : 'Verified'}
                    </span>
                  </td>
                  <td>
                    <button className="table-action-btn">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
            <div className="empty-table-state">No recent activity logged in the system.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
