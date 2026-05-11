import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('combined'));

// Auth Middleware
const authenticateToken = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error(`AUTH_ERROR [${req.method} ${req.path}]:`, err.message);
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    console.log(`AUTH_SUCCESS [${req.method} ${req.path}]: User ${user.employeeId} (${user.role})`);
    req.user = user;
    next();
  });
};

// Admin Check Middleware
const requireAdmin = (req: any, res: any, next: NextFunction) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

const requireManagement = (req: any, res: any, next: NextFunction) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden. Management access required.' });
  }
  next();
};

// Helper: Haversine formula to calculate distance between two points in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}

// --- Auth Routes ---

// Login (Updated to use employeeId)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { employeeId, password } = req.body;

  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      include: { site: true }
    });

    if (!employee) {
      return res.status(400).json({ error: 'Invalid Employee ID or password' });
    }

    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid Employee ID or password' });
    }

    const token = jwt.sign(
      { id: employee.id, employeeId: employee.employeeId, role: employee.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = employee;
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin Management Routes ---

// Add new employee (Admin only)
app.post('/api/employees', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const { employeeId, firstName, lastName, email, password, role, designation, siteId, avatar } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const newEmployee = await prisma.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: role || 'EMPLOYEE',
        designation,
        siteId,
        avatar
      }
    });
    const { password: _, ...userWithoutPassword } = newEmployee;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create employee. ID or Email might already exist.' });
  }
});

// Get single employee
app.get('/api/employees/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { site: true }
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const { password: _, ...userWithoutPassword } = employee;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee intelligence' });
  }
});

// Update employee (Management only)
app.put('/api/employees/:id', authenticateToken, requireManagement, async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  try {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await prisma.employee.update({
      where: { id },
      data
    });
    const { password: _, ...userWithoutPassword } = updated;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update employee' });
  }
});

// Delete employee (Admin only)
app.delete('/api/employees/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.employee.delete({ where: { id } });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete employee' });
  }
});

// Enroll biometric (First-time validation against Admin Photo)
app.post('/api/employees/:id/enroll', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { faceDescriptor } = req.body;

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: { 
        isBiometricEnrolled: true,
        biometricToken: JSON.stringify(faceDescriptor)
      }
    });
    const { password: _, ...userWithoutPassword } = updated;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(400).json({ error: 'Failed to enroll biometric identity' });
  }
});

// Get all sites
app.get('/api/sites', authenticateToken, async (req, res) => {
  try {
    const sites = await prisma.site.findMany({
      include: {
        _count: {
          select: { employees: true }
        }
      }
    });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// Create new site (Admin only)
// Add new site (Management)
app.post('/api/sites', authenticateToken, requireManagement, async (req, res) => {
  const { name, location, managerName, latitude, longitude } = req.body;
  try {
    const site = await prisma.site.create({
      data: {
        name,
        location,
        managerName,
        latitude: latitude || 0,
        longitude: longitude || 0
      }
    });
    res.status(201).json(site);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create site' });
  }
});

// Update site coordinates (Admin and Manager)
app.put('/api/sites/:id/coordinates', authenticateToken, async (req: any, res: Response) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;

  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden. Management access required.' });
  }

  try {
    const updated = await prisma.site.update({
      where: { id },
      data: { latitude, longitude }
    });
    res.json(updated);
  } catch (error) {
    console.error('BACKEND_ERROR [UpdateSiteCoords]:', error);
    res.status(400).json({ error: 'Failed to update site coordinates' });
  }
});

// Update site details (Management)
app.put('/api/sites/:id', authenticateToken, requireManagement, async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, location, managerName } = req.body;

  try {
    const site = await prisma.site.update({
      where: { id },
      data: { name, location, managerName }
    });
    res.json(site);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update hub' });
  }
});

// Decommission site (Management)
app.delete('/api/sites/:id', authenticateToken, requireManagement, async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    // First, unassign employees from this site
    await prisma.employee.updateMany({
      where: { siteId: id },
      data: { siteId: null }
    });

    await prisma.site.delete({ where: { id } });
    res.json({ message: 'Hub decommissioned successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to decommission hub. Ensure all dependencies are cleared.' });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TrackForce Backend is running' });
});

// Get all employees
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { site: true }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get Dashboard Stats
app.get('/api/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    // Fetch the latest user state from DB to avoid stale role in token
    const dbUser = await prisma.employee.findUnique({
      where: { id: req.user.id }
    });

    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const isManagement = dbUser.role === 'ADMIN' || dbUser.role === 'MANAGER';
    
    if (!isManagement) {
      // Personal stats for Employee
      const employeeId = req.user.id;
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const logs = await prisma.attendance.findMany({
        where: { employeeId, clockIn: { gte: weekStart } }
      });

      let totalMinutes = 0;
      logs.forEach(log => {
        if (log.clockIn && log.clockOut) {
          totalMinutes += (log.clockOut.getTime() - log.clockIn.getTime()) / (1000 * 60);
        }
      });

      const weeklyHours = (totalMinutes / 60).toFixed(1);
      const earnings = (totalMinutes / 60 * 25).toFixed(2); // Using default rate of $25

      // Calculate simple efficiency based on shift consistency (mocked for now but based on logs)
      const efficiency = logs.length > 0 ? (90 + (logs.length * 2)).toString() : "0";

      // Real daily trend for the employee
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyTrend = days.map(day => {
        const count = logs.filter(l => days[new Date(l.date).getDay()] === day).length;
        return { name: day, attendance: count > 0 ? 8 : 0 }; // 8 hours if they worked that day
      });

      const recentLogs = logs.slice(0, 5).map(log => ({
        type: 'LOG',
        title: 'Shift Started',
        message: `You clocked in at ${new Date(log.clockIn).toLocaleTimeString()}`,
        time: log.clockIn
      }));

      return res.json({
        weeklyHours,
        earnings,
        efficiency,
        weeklyTrend,
        recentLogs,
        activeSite: req.user.site?.name || 'Assigned Site'
      });
    }

    // Global stats for Management
    const totalEmployees = await prisma.employee.count();
    const activeAttendance = await prisma.attendance.count({
      where: { clockOut: null }
    });
    const totalSites = await prisma.site.count();
    const recentAlerts = await prisma.securityAlert.count();

    const completedShifts = await prisma.attendance.findMany({
      where: { clockOut: { not: null } },
      take: 50
    });
    
    let totalMs = 0;
    completedShifts.forEach(s => {
      if (s.clockIn && s.clockOut) {
        totalMs += (s.clockOut.getTime() - s.clockIn.getTime());
      }
    });
    const avgHours = completedShifts.length > 0 ? (totalMs / completedShifts.length / (1000 * 60 * 60)).toFixed(1) : "0";

    const sitePerformance = await prisma.site.findMany({
      include: { _count: { select: { employees: true } } },
      take: 5
    });

    const alerts = await prisma.securityAlert.findMany({ take: 3, orderBy: { timestamp: 'desc' } });
    const attendance = await prisma.attendance.findMany({ take: 3, orderBy: { clockIn: 'desc' }, include: { employee: true } });

    const recentLogs = [
      ...alerts.map(a => ({ type: 'ALERT', title: 'Security Breach', message: a.message, time: a.timestamp })),
      ...attendance.map(att => ({ type: 'LOG', title: 'Shift Started', message: `${att.employee.firstName} ${att.employee.lastName} clocked in`, time: att.clockIn }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

    // Calculate real daily global trend
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const weeklyTrend = await Promise.all(last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = await prisma.attendance.count({
        where: { clockIn: { gte: date, lt: nextDay } }
      });
      return {
        name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        attendance: count
      };
    }));

    res.json({
      totalEmployees,
      activeNow: activeAttendance,
      sites: totalSites,
      violations: recentAlerts,
      avgShift: avgHours,
      recentLogs,
      sitePerformance: sitePerformance.map(s => ({ name: s.name, count: s._count.employees })),
      weeklyTrend
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard intelligence' });
  }
});


// Live Tracking Data (Admin only)
app.get('/api/tracking/live', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sites = await prisma.site.findMany();
    const activeAttendance = await prisma.attendance.findMany({
      where: {
        clockOut: null,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            designation: true,
            employeeId: true
          }
        }
      }
    });

    res.json({
      sites,
      activeEmployees: activeAttendance
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tracking data' });
  }
});

// Clock In with Geofencing
app.post('/api/attendance/clock-in/:employeeId', authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  const { latitude, longitude, biometricProof } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Location data is required to clock in.' });
  }

  try {
    // 1. Get Employee and their assigned Site
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { site: true }
    });

    if (!employee || !employee.site) {
      return res.status(400).json({ error: 'Employee or assigned site not found.' });
    }

    // 2. Check distance (Site lat/long vs Employee lat/long)
    const siteLat = employee.site.latitude || 0;
    const siteLong = employee.site.longitude || 0;

    // Calculate distance
    const distance = getDistance(latitude, longitude, siteLat, siteLong);
    const ALLOWED_RADIUS = 300; // 300 meters
    const isManagement = (req as any).user?.role === 'ADMIN' || (req as any).user?.role === 'MANAGER';

    if (distance > ALLOWED_RADIUS && !isManagement) {
      // Log Security Violation
      await prisma.securityAlert.create({
        data: {
          type: 'GEOFENCE_VIOLATION',
          message: `${employee.firstName} ${employee.lastName} attempted clock-in from ${Math.round(distance)}m away (Out of Bounds).`,
          severity: 'MEDIUM',
          employeeId: employee.id,
          siteId: employee.siteId
        }
      });

      return res.status(403).json({
        error: `Out of Bounds. You are ${Math.round(distance)}m away from the site. Must be within ${ALLOWED_RADIUS}m.`,
        distance: Math.round(distance)
      });
    }

    // 3. Create Attendance Record
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        clockInLat: latitude,
        clockInLong: longitude,
        biometricProof, // Store the snapshot
        status: 'PENDING'
      }
    });

    res.json(attendance);
  } catch (error: any) {
    console.error('BACKEND_ERROR [ClockIn]:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Manual Attendance Log (Management only)
app.post('/api/attendance/manual', authenticateToken, requireManagement, async (req, res) => {
  const { employeeId, siteId, clockIn, clockOut, date, status } = req.body;

  try {
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        siteId,
        clockIn: new Date(clockIn),
        clockOut: clockOut ? new Date(clockOut) : null,
        date: new Date(date),
        status: status || 'PRESENT',
        biometricProof: 'MANUAL_ENTRY_BY_ADMIN'
      }
    });
    res.status(201).json(attendance);
  } catch (error: any) {
    console.error('BACKEND_ERROR [ManualAttendance]:', error);
    res.status(500).json({ error: 'Failed to log manual attendance' });
  }
});

// Get today's attendance for an employee
app.get('/api/attendance/today/:employeeId', authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const logs = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: today
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error: any) {
    console.error('BACKEND_ERROR [FetchTodayLogs]:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Clock Out
app.post('/api/attendance/clock-out/:employeeId', authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  const { latitude, longitude } = req.body;

  try {
    // Find the latest record that hasn't been clocked out yet
    const latestAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        clockOut: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestAttendance) {
      return res.status(400).json({ error: 'No active clock-in found' });
    }

    const updated = await prisma.attendance.update({
      where: { id: latestAttendance.id },
      data: { 
        clockOut: new Date(),
        clockOutLat: latitude,
        clockOutLong: longitude
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('BACKEND_ERROR [ClockOut]:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// Start Break
app.post('/api/attendance/break-start/:employeeId', authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  try {
    const activeAttendance = await prisma.attendance.findFirst({
      where: { employeeId, clockOut: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeAttendance) return res.status(400).json({ error: 'Must be clocked in to take a break' });

    const newBreak = await prisma.break.create({
      data: { attendanceId: activeAttendance.id }
    });
    res.json(newBreak);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start break' });
  }
});

// End Break
app.post('/api/attendance/break-end/:employeeId', authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  try {
    const activeAttendance = await prisma.attendance.findFirst({
      where: { employeeId, clockOut: null },
      orderBy: { createdAt: 'desc' },
      include: { breaks: { where: { endTime: null } } }
    });

    const activeBreak = activeAttendance?.breaks[0];
    if (!activeBreak) return res.status(400).json({ error: 'No active break found' });

    const updatedBreak = await prisma.break.update({
      where: { id: activeBreak.id },
      data: { endTime: new Date() }
    });
    res.json(updatedBreak);
  } catch (error) {
    res.status(500).json({ error: 'Failed to end break' });
  }
});

// Get Payroll Data
app.get('/api/payroll', authenticateToken, async (req: any, res: Response) => {
  const isManagement = req.user.role === 'ADMIN' || req.user.role === 'MANAGER';

  try {
    const employees = await prisma.employee.findMany({
      where: isManagement ? {} : { id: req.user.id },
      include: {
        attendance: {
          where: {
            clockOut: { not: null }
          }
        }
      }
    });

    const payrollData = employees.map(emp => {
      let totalMinutes = 0;
      let overtimeMinutes = 0;
      const HOURLY_RATE = 25; // Default rate
      const REGULAR_HOURS_THRESHOLD = 8 * 60; // 8 hours in minutes

      emp.attendance.forEach(log => {
        if (log.clockIn && log.clockOut) {
          const duration = (log.clockOut.getTime() - log.clockIn.getTime()) / (1000 * 60);
          totalMinutes += duration;

          if (duration > REGULAR_HOURS_THRESHOLD) {
            overtimeMinutes += (duration - REGULAR_HOURS_THRESHOLD);
          }
        }
      });

      const totalHours = totalMinutes / 60;
      const overtimeHours = overtimeMinutes / 60;
      const regularHours = totalHours - overtimeHours;

      const earnings = (regularHours * HOURLY_RATE) + (overtimeHours * HOURLY_RATE * 1.5);

      return {
        id: emp.id,
        employee: {
          firstName: emp.firstName,
          lastName: emp.lastName,
          employeeId: emp.employeeId
        },
        totalHours: totalHours.toFixed(1),
        earnings: parseFloat(earnings.toFixed(2)),
        status: 'PENDING'
      };
    });

    res.json(payrollData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch payroll data' });
  }
});

// Get all attendance logs (Admin/Manager only)
app.get('/api/attendance/all', authenticateToken, async (req: any, res: Response) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  try {
    const logs = await prisma.attendance.findMany({
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            designation: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all logs' });
  }
});

// Update Attendance Log (Approve/Reject)
app.patch('/api/attendance/:id', authenticateToken, async (req: any, res: Response) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden. Management access required.' });
  }

  const { id } = req.params;
  const { status } = req.body; // 'APPROVED' | 'REJECTED'

  try {
    const updated = await prisma.attendance.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update attendance log' });
  }
});

// Delete Attendance Log (Admin only)
app.delete('/api/attendance/:id', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    // First, delete any breaks associated with this attendance
    await prisma.break.deleteMany({
      where: { attendanceId: id }
    });

    await prisma.attendance.delete({
      where: { id }
    });
    res.json({ message: 'Log purged successfully' });
  } catch (error) {
    console.error('PURGE_ERROR:', error);
    res.status(500).json({ error: 'Failed to purge attendance log. Ensure no active dependencies exist.' });
  }
});

// Process Payroll (Update status to PAID)
app.post('/api/payroll/process', authenticateToken, async (req: any, res: Response) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden. Management access required.' });
  }

  try {

    const updated = await prisma.attendance.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'PAID' }
    });
    res.json({ message: `Processed ${updated.count} payments successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process payroll' });
  }
});

// --- Security Alerts ---
app.put('/api/sites/:id/coordinates', authenticateToken, async (req: any, res: Response) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;

  try {
    const site = await prisma.site.update({
      where: { id },
      data: { latitude, longitude }
    });
    res.json(site);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update coordinates' });
  }
});


// --- System Configuration (Hardening) ---
let systemConfig = {
  strictGeofencing: true,
  biometricRequired: true,
  notificationsEnabled: true,
  theme: 'dark',
  lastUpdated: new Date().toISOString()
};

app.get('/api/config', authenticateToken, (req, res) => {
  res.json(systemConfig);
});

app.post('/api/config', authenticateToken, requireAdmin, (req, res) => {
  systemConfig = { ...systemConfig, ...req.body, lastUpdated: new Date().toISOString() };
  console.log('SYSTEM_CONFIG_UPDATED:', systemConfig);
  res.json(systemConfig);
});

// --- Enhanced Payroll Analytics ---
app.get('/api/payroll/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const isManagement = req.user.role === 'ADMIN' || req.user.role === 'MANAGER';
    const logs = await prisma.attendance.findMany({
      where: { 
        clockOut: { not: null },
        ...(isManagement ? {} : { employeeId: req.user.id })
      }
    });

    let totalCost = 0;
    let totalHours = 0;
    let overtimeHours = 0;
    const HOURLY_RATE = 25;

    logs.forEach(log => {
      if (log.clockIn && log.clockOut) {
        const hours = (log.clockOut.getTime() - log.clockIn.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
        if (hours > 8) {
          const ot = hours - 8;
          overtimeHours += ot;
          totalCost += (8 * HOURLY_RATE) + (ot * HOURLY_RATE * 1.5);
        } else {
          totalCost += hours * HOURLY_RATE;
        }
      }
    });

    res.json({
      totalPayout: parseFloat(totalCost.toFixed(2)),
      totalHours: parseFloat(totalHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      activeRecipients: isManagement ? logs.length : 1,
      currency: 'USD',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute payroll analytics' });
  }
});

app.get('/api/security/alerts', authenticateToken, async (req: any, res: Response) => {
  try {
    const alerts = await prisma.securityAlert.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch security alerts' });
  }
});

app.post('/api/security/alerts', authenticateToken, async (req: any, res: Response) => {
  const { type, message, severity, employeeId, siteId } = req.body;
  try {
    const alert = await prisma.securityAlert.create({
      data: { type, message, severity, employeeId, siteId }
    });
    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ error: 'Failed to log security alert' });
  }
});

app.listen(PORT, () => {




  console.log(`Server is running on port ${PORT}`);
});

