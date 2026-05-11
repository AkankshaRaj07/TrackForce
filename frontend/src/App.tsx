import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import { Login } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import AddEmployee from './pages/AddEmployee';
import Attendance from './pages/Attendance';
import Tracking from './pages/Tracking';
import Payroll from './pages/Payroll';
import Sites from './pages/Sites';
import Settings from './pages/Settings';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import './App.css';

import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Simple Layout Wrapper
const PlatformLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="app-container">
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      <div className={`sidebar-wrapper ${sidebarOpen ? 'mobile-open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      <main className="main-stage">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Private/Platform Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><PlatformLayout><Dashboard /></PlatformLayout></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><PlatformLayout><Employees /></PlatformLayout></ProtectedRoute>} />
          <Route path="/employees/add" element={<ProtectedRoute adminOnly><PlatformLayout><AddEmployee /></PlatformLayout></ProtectedRoute>} />
          <Route path="/employees/edit/:id" element={<ProtectedRoute><PlatformLayout><AddEmployee /></PlatformLayout></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><PlatformLayout><Attendance /></PlatformLayout></ProtectedRoute>} />
          <Route path="/tracking" element={<ProtectedRoute><PlatformLayout><Tracking /></PlatformLayout></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute><PlatformLayout><Payroll /></PlatformLayout></ProtectedRoute>} />
          <Route path="/sites" element={<ProtectedRoute><PlatformLayout><Sites /></PlatformLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PlatformLayout><Settings /></PlatformLayout></ProtectedRoute>} />

          {/* Redirect any other path to Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
