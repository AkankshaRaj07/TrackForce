import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "*"],
      "frame-src": ["'self'", "http://localhost:5000", "http://localhost:5173"],
      "frame-ancestors": ["'self'", "http://localhost:5173"]
    }
  },
  frameguard: false // Disabling X-Frame-Options to allow CSP frame-ancestors to handle it
}));



const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined'));

// Static File Server
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Advanced Hierarchical Multer Configuration
const storage = multer.diskStorage({
  destination: async (req: any, file, cb) => {
    let folderId = req.body.employeeId || req.params.employeeId || 'unknown';

    if (req.params.id && folderId === 'unknown') {
      try {
        const emp = await prisma.employee.findUnique({ where: { id: req.params.id } });
        if (emp) folderId = emp.employeeId;
      } catch (err) {
        console.error("Multer destination error:", err);
      }
    }


    let typeDir = 'documents';

    if (file.fieldname === 'avatar') typeDir = 'profile_picture';
    else if (file.fieldname === 'cv') typeDir = 'cv';
    else if (file.fieldname === 'idDoc') typeDir = 'passport_id';
    else if (file.fieldname === 'biometricProof') typeDir = 'attendance';

    const userDir = path.join(UPLOADS_DIR, folderId, typeDir);



    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req: any, file, cb) => {
    const sanitizedOriginal = file.originalname.replace(/[^a-z0-9.]/gi, '-').toLowerCase();
    let prefix = 'document';
    if (file.fieldname === 'avatar') prefix = 'profile';
    else if (file.fieldname === 'cv') prefix = 'resume';
    else if (file.fieldname === 'idDoc') prefix = 'id_proof';


    cb(null, `${prefix}_${sanitizedOriginal}`);
  }
});

const upload = multer({ storage });
const employeeUploads = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'idDoc', maxCount: 1 }
]);

// 90-Day Purge Protocol
cron.schedule('0 0 * * *', () => {
  console.log('🔄 [Retention Protocol]: Initializing 90-Day Attendance Purge...');
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

  try {
    const users = fs.readdirSync(UPLOADS_DIR);
    users.forEach(userId => {
      const personalDir = path.join(UPLOADS_DIR, userId, 'personal_details', 'attendance');
      if (fs.existsSync(personalDir)) {
        const files = fs.readdirSync(personalDir);
        files.forEach(file => {
          const filePath = path.join(personalDir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs < ninetyDaysAgo) {
            fs.unlinkSync(filePath);
          }
        });
      }
    });
  } catch (err) {
    console.error('❌ [Retention Protocol Error]:', err);
  }
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req: any, res: any, next: NextFunction) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  next();
};

const requireManagement = (req: any, res: any, next: NextFunction) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') return res.status(403).json({ error: 'Forbidden. Management access required.' });
  next();
};

// Helper: Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Calculate rounded duration in minutes
// Implements the "30-minute block" rule: any partial time < 30 mins is rounded down
function calculateRoundedDuration(clockIn: Date, clockOut: Date, breaks: any[] = []) {
  let durationMs = clockOut.getTime() - clockIn.getTime();
  
  // Subtract break durations
  if (breaks && breaks.length > 0) {
    breaks.forEach(b => {
      if (b.startTime && b.endTime) {
        durationMs -= (new Date(b.endTime).getTime() - new Date(b.startTime).getTime());
      }
    });
  }

  const durationMins = Math.max(0, durationMs / (1000 * 60));
  // Round down to the nearest 30-minute block (e.g., 5:10 -> 5:00, 5:35 -> 5:30)
  return Math.floor(durationMins / 30) * 30;
}


// --- Auth Routes ---

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { employeeId, password } = req.body;
  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      include: { site: true }
    });
    if (!employee) return res.status(400).json({ error: 'Invalid Employee ID or password' });
    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid Employee ID or password' });

    const token = jwt.sign({ id: employee.id, employeeId: employee.employeeId, role: employee.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { ...employee, password: undefined } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Site Routes ---

app.get('/api/sites', authenticateToken, async (req, res) => {
  try {
    const sites = await prisma.site.findMany({ include: { _count: { select: { employees: true } } } });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

app.post('/api/sites', authenticateToken, requireManagement, async (req, res) => {
  const { name, location, managerName, latitude, longitude, geofenceRadius } = req.body;
  try {
    const site = await prisma.site.create({
      data: {
        name, location, managerName,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        geofenceRadius: parseFloat(geofenceRadius) || 500
      }
    });
    res.status(201).json(site);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create site' });
  }
});

app.put('/api/sites/:id', authenticateToken, requireManagement, async (req, res) => {
  const { name, location, managerName, geofenceRadius, latitude, longitude } = req.body;
  try {
    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: {
        name, location, managerName,
        geofenceRadius: geofenceRadius ? parseFloat(geofenceRadius) : undefined,

        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined
      }
    });
    res.json(site);
  } catch (error) {
    res.status(400).json({ error: 'Update failed' });
  }
});

app.delete('/api/sites/:id', authenticateToken, requireManagement, async (req, res) => {
  try {
    await prisma.employee.updateMany({ where: { siteId: req.params.id }, data: { siteId: null } });
    await prisma.site.delete({ where: { id: req.params.id } });
    res.json({ message: 'Site deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Delete failed' });
  }
});

// --- Employee Routes ---

app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({ include: { site: true } });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.post('/api/employees', authenticateToken, requireAdmin, employeeUploads, async (req: any, res: Response) => {
  const { 
    employeeId, fullName, phone, password, role, designation, siteId, 
    hourlyRate, overtimeType, overtimeValue, 
    passportNumber, passportExpiry, passportIssue, dob,
    bankName, accountNumber, accountHolderName, swiftCode
  } = req.body;
  try {
    const nameParts = fullName ? fullName.split(' ') : ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';
    let avatar = null, cvPath = null, idDocPath = null;
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.avatar) avatar = `/uploads/${employeeId}/profile_picture/${files.avatar[0].filename}`;
      if (files.cv) cvPath = `/uploads/${employeeId}/cv/${files.cv[0].filename}`;
      if (files.idDoc) idDocPath = `/uploads/${employeeId}/passport_id/${files.idDoc[0].filename}`;

    }
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const newEmployee = await prisma.employee.create({
      data: {
        employeeId, firstName, lastName, phone, password: hashedPassword, plainPassword: password || 'password123', role: role || 'EMPLOYEE', designation, siteId, avatar, cvPath, idDocPath,
        hourlyRate: parseFloat(hourlyRate as any) || 0.0, overtimeType: overtimeType || 'MULTIPLIER', overtimeValue: parseFloat(overtimeValue as any) || 1.5,
        passportNumber, passportExpiry: passportExpiry ? new Date(passportExpiry) : null, passportIssue: passportIssue ? new Date(passportIssue) : null, dob: dob ? new Date(dob) : null,
        bankName, accountNumber, accountHolderName, swiftCode
      } as any
    });
    res.status(201).json({ ...newEmployee, password: undefined });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create employee. Site might already be assigned.' });
  }
});

app.get('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id }, include: { site: true } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ ...employee, password: employee.plainPassword || 'Encoded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

app.get('/api/employees/:id/full-profile', authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: { site: true, attendance: { orderBy: { date: 'desc' }, include: { breaks: true } } }
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    let totalMinutes = 0, totalEarnings = 0;
    const rate = employee.hourlyRate || 0;
    employee.attendance.forEach(log => {
      if (log.clockIn && log.clockOut) {
        const duration = calculateRoundedDuration(new Date(log.clockIn), new Date(log.clockOut), log.breaks);
        totalMinutes += duration;
        let dayEarnings = (duration / 60) * rate;
        if (duration > 480) {
          const overtimeMinutes = duration - 480;
          const overtimeRate = employee.overtimeType === 'MULTIPLIER' ? rate * (employee.overtimeValue || 1.5) : rate + (employee.overtimeValue || 0);
          dayEarnings = (8 * rate) + ((overtimeMinutes / 60) * overtimeRate);
        }
        totalEarnings += dayEarnings;
      }
    });

    res.json({ employee: { ...employee, password: employee.plainPassword || 'Encoded' }, attendance: employee.attendance, stats: { totalHours: (totalMinutes / 60).toFixed(1), totalEarnings: totalEarnings.toFixed(2), totalDays: employee.attendance.length } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch full profile' });
  }
});

app.put('/api/employees/:id', authenticateToken, employeeUploads, async (req: any, res: Response) => {
  const { id } = req.params;
  const isSelf = req.user.id === id;
  const isManagement = req.user.role === 'ADMIN' || req.user.role === 'MANAGER';

  if (!isSelf && !isManagement) {
    return res.status(403).json({ error: 'Forbidden. Access denied.' });
  }

  let data = { ...req.body };

  // If not management, strip sensitive fields to prevent self-elevation or salary modification
  if (!isManagement) {
    const allowedFields = ['firstName', 'lastName', 'phone', 'password', 'avatar', 'dob', 'bankName', 'accountNumber', 'accountHolderName', 'swiftCode'];
    const filteredData: any = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) filteredData[field] = data[field];
    });
    data = filteredData;
  }

  try {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    if (data.password) {
      data.plainPassword = data.password;
      data.password = await bcrypt.hash(data.password, 10);
    }
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.avatar) data.avatar = `/uploads/${existing.employeeId}/profile_picture/${files.avatar[0].filename}`;
      if (files.cv) data.cvPath = `/uploads/${existing.employeeId}/cv/${files.cv[0].filename}`;
      if (files.idDoc) data.idDocPath = `/uploads/${existing.employeeId}/passport_id/${files.idDoc[0].filename}`;
    }
    if (data.dob) data.dob = new Date(data.dob);
    if (data.passportExpiry) data.passportExpiry = new Date(data.passportExpiry);
    if (data.passportIssue) data.passportIssue = new Date(data.passportIssue);
    if (data.fullName) {
      const nameParts = data.fullName.split(' ');
      data.firstName = nameParts[0] || '';
      data.lastName = nameParts.slice(1).join(' ') || ' ';
      delete data.fullName;
    }
    if (data.hourlyRate) data.hourlyRate = parseFloat(data.hourlyRate);
    if (data.overtimeValue) data.overtimeValue = parseFloat(data.overtimeValue);
    const updated = await prisma.employee.update({ where: { id }, data: data as any });
    res.json({ ...updated, password: undefined });
  } catch (error) {
    res.status(400).json({ error: 'Update failed' });
  }
});

app.delete('/api/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Delete failed' });
  }
});

app.post('/api/employees/:id/enroll', authenticateToken, async (req, res) => {
  try {
    await prisma.employee.update({ where: { id: req.params.id }, data: { isBiometricEnrolled: true, biometricToken: JSON.stringify(req.body.faceDescriptor) } });
    res.json({ message: 'Enrolled' });
  } catch (error) {
    res.status(400).json({ error: 'Enrollment failed' });
  }
});

// --- Attendance Routes ---

app.post('/api/attendance/clock-in/:id', authenticateToken, upload.single('biometricProof'), async (req: any, res: Response) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) return res.status(400).json({ error: 'Location required' });
  try {
    const employee = await prisma.employee.findUnique({ where: { id }, include: { site: true } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (!employee.site) return res.status(400).json({ error: 'No operational site assigned to your profile. Please contact admin.' });
    
    const distance = getDistance(parseFloat(latitude), parseFloat(longitude), employee.site.latitude || 0, employee.site.longitude || 0);
    const radius = employee.site.geofenceRadius || 500;
    if (distance > radius && req.user.role === 'EMPLOYEE') {
      await prisma.securityAlert.create({ data: { type: 'GEOFENCE_VIOLATION', message: `${employee.firstName} clocked in from ${Math.round(distance)}m away.`, severity: 'MEDIUM', employeeId: employee.id, siteId: employee.siteId } });
      return res.status(403).json({ error: `Out of bounds (${Math.round(distance)}m away from ${employee.site.name})` });
    }
    let biometricProof = null;
    if (req.file) {
      biometricProof = `/uploads/${employee.employeeId}/attendance/${req.file.filename}`;
    }
    
    const attendance = await prisma.attendance.create({ 
      data: { 
        employeeId: employee.id, 
        siteId: employee.siteId, 
        clockInLat: parseFloat(latitude), 
        clockInLong: parseFloat(longitude), 
        status: 'PENDING',
        biometricProof
      } 
    });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Clock-in failed' });
  }
});

app.post('/api/attendance/clock-out/:id', authenticateToken, upload.single('biometricProof'), async (req: any, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const active = await prisma.attendance.findFirst({ where: { employeeId: employee.id, clockOut: null }, orderBy: { createdAt: 'desc' } });
    if (!active) return res.status(400).json({ error: 'No active clock-in' });
    
    let biometricProofOut = null;
    if (req.file) {
      biometricProofOut = `/uploads/${employee.employeeId}/attendance/${req.file.filename}`;
    }

    const updated = await prisma.attendance.update({ 
      where: { id: active.id }, 
      data: { 
        clockOut: new Date(), 
        clockOutLat: latitude ? parseFloat(latitude) : null, 
        clockOutLong: longitude ? parseFloat(longitude) : null,
        biometricProofOut
      } 
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Clock-out failed' });
  }
});

app.get('/api/attendance/today/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const logs = await prisma.attendance.findMany({ where: { employeeId: employee.id, date: { gte: new Date(new Date().setHours(0,0,0,0)) } }, orderBy: { createdAt: 'desc' }, include: { breaks: true } });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/api/attendance', authenticateToken, async (req: any, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const isManager = req.user.role === 'MANAGER';
    
    const where = (!isAdmin && !isManager) ? { employeeId: req.user.id } : {};
    
    const logs = await prisma.attendance.findMany({
      where,
      include: { employee: true, breaks: true },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

app.patch('/api/attendance/:id', authenticateToken, requireManagement, async (req, res) => {
  try {
    const updated = await prisma.attendance.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Update failed' });
  }
});

app.delete('/api/attendance/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.break.deleteMany({ where: { attendanceId: req.params.id } });
    await prisma.attendance.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Delete failed' });
  }
});

app.post('/api/attendance/manual', authenticateToken, requireManagement, async (req, res) => {
  const { employeeId, siteId, clockIn, clockOut, date, status } = req.body;
  try {
    const att = await prisma.attendance.create({ data: { employeeId, siteId, clockIn: new Date(clockIn), clockOut: clockOut ? new Date(clockOut) : null, date: new Date(date), status: status || 'PRESENT', biometricProof: 'MANUAL' } });
    res.status(201).json(att);
  } catch (error) {
    res.status(400).json({ error: 'Log failed' });
  }
});

// --- Break Routes ---

app.post('/api/attendance/break-start/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const active = await prisma.attendance.findFirst({ where: { employeeId: employee.id, clockOut: null }, orderBy: { createdAt: 'desc' } });
    if (!active) return res.status(400).json({ error: 'Not clocked in' });
    const b = await prisma.break.create({ data: { attendanceId: active.id } });
    res.json(b);
  } catch (error) {
    res.status(500).json({ error: 'Break start failed' });
  }
});

app.post('/api/attendance/break-end/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const active = await prisma.attendance.findFirst({ where: { employeeId: employee.id, clockOut: null }, include: { breaks: { where: { endTime: null } } } });
    if (!active?.breaks[0]) return res.status(400).json({ error: 'No active break' });
    const updated = await prisma.break.update({ where: { id: active.breaks[0].id }, data: { endTime: new Date() } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Break end failed' });
  }
});

// --- Payroll Routes ---

app.get('/api/payroll', authenticateToken, async (req: any, res: Response) => {
  try {
    const isManagement = req.user.role !== 'EMPLOYEE';
    const employees = await prisma.employee.findMany({ where: isManagement ? {} : { id: req.user.id }, include: { attendance: { where: { clockOut: { not: null } }, include: { breaks: true } } } });

    const data = employees.map(emp => {
      let totalMins = 0, otMins = 0, rate = emp.hourlyRate || 25;
      emp.attendance.forEach(log => {
        const d = calculateRoundedDuration(new Date(log.clockIn), new Date(log.clockOut!), log.breaks);
        totalMins += d;
        if (d > 480) otMins += (d - 480);
      });

      const th = totalMins / 60, oh = otMins / 60, rh = th - oh;
      let earn = rh * rate;
      earn += (emp.overtimeType === 'MULTIPLIER' ? oh * rate * (emp.overtimeValue || 1.5) : oh * (emp.overtimeValue || 20));
      return { id: emp.id, employee: emp, regularHours: rh.toFixed(1), overtimeHours: oh.toFixed(1), totalHours: th.toFixed(1), earnings: earn.toFixed(2), status: 'PENDING' };
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Payroll failed' });
  }
});

app.post('/api/payroll/process', authenticateToken, requireManagement, async (req, res) => {
  try {
    await prisma.attendance.updateMany({ where: { status: 'PENDING' }, data: { status: 'PAID' } });
    res.json({ message: 'Processed' });
  } catch (error) {
    res.status(500).json({ error: 'Process failed' });
  }
});

app.get('/api/payroll/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const isMgmt = req.user.role !== 'EMPLOYEE';
    const logs = await prisma.attendance.findMany({ where: { clockOut: { not: null }, ...(isMgmt ? {} : { employeeId: req.user.id }) }, include: { employee: true, breaks: true } });

    let cost = 0, hours = 0;
    logs.forEach(l => {
      const h = calculateRoundedDuration(new Date(l.clockIn), new Date(l.clockOut!), l.breaks) / 60;
      hours += h;
      cost += (h * (l.employee?.hourlyRate || 25));
    });

    res.json({ totalPayout: cost.toFixed(2), totalHours: hours.toFixed(1), activeRecipients: isMgmt ? logs.length : 1 });
  } catch (error) {
    res.status(500).json({ error: 'Stats failed' });
  }
});

// --- System Routes ---

app.get('/api/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const isMgmt = req.user.role !== 'EMPLOYEE';
    
    // 1. Core Counts
    const totalEmployees = await prisma.employee.count();
    const activeNow = await prisma.attendance.count({ where: { clockOut: null } });
    const totalSites = await prisma.site.count();
    
    // 2. Site Performance (Active employees per site)
    const sitePerformanceRaw = await prisma.attendance.groupBy({
      by: ['siteId'],
      where: { clockOut: null },
      _count: { id: true }
    });

    const sitePerformance = await Promise.all(sitePerformanceRaw.map(async (sp) => {
      const site = await prisma.site.findUnique({ where: { id: sp.siteId || '' } });
      return {
        name: site?.name || 'Mobile Operations',
        count: sp._count.id
      };
    }));

    // 3. Weekly Trend (Last 7 days)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0,0,0,0));
      const end = new Date(date.setHours(23,59,59,999));
      
      const count = await prisma.attendance.count({
        where: {
          date: { gte: start, lte: end },
          ...(isMgmt ? {} : { employeeId: req.user.id })
        }
      });
      
      trend.push({
        name: start.toLocaleDateString('en-US', { weekday: 'short' }),
        attendance: count
      });
    }

    // 4. Recent Activity/Logs
    const recentLogs: any[] = [];
    if (isMgmt) {
      const alerts = await prisma.securityAlert.findMany({ take: 5, orderBy: { timestamp: 'desc' } });
      alerts.forEach(a => {
        recentLogs.push({
          type: 'ALERT',
          title: a.type,
          message: a.message,
          time: a.timestamp
        });
      });
    } else {
      const personalLogs = await prisma.attendance.findMany({
        where: { employeeId: req.user.id },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      personalLogs.forEach(l => {
        recentLogs.push({
          type: 'LOG',
          title: l.clockOut ? 'Shift Completed' : 'Session Active',
          message: `Check-in recorded at ${new Date(l.clockIn).toLocaleTimeString()}`,
          time: l.createdAt
        });
      });
    }

    // 5. Employee specific metrics
    let employeeMetrics: any = {};
    if (!isMgmt) {
      const attendance = await prisma.attendance.findMany({ where: { employeeId: req.user.id } });
      const weeklyHours = attendance.reduce((acc, curr) => acc + (curr.clockOut ? (new Date(curr.clockOut).getTime() - new Date(curr.clockIn).getTime()) / (1000 * 60 * 60) : 0), 0);
      employeeMetrics = {
        weeklyHours: weeklyHours.toFixed(1),
        efficiency: 98, // Simulated
        earnings: Math.round(weeklyHours * 250000) // Simulated 250k/hr
      };
    }

    res.json({
      totalEmployees,
      activeNow,
      sites: totalSites,
      sitePerformance,
      weeklyTrend: trend,
      recentLogs,
      ...employeeMetrics
    });
  } catch (error) {
    console.error("Stats aggregation error:", error);
    res.status(500).json({ error: 'Stats intelligence failure' });
  }
});

app.get('/api/tracking/live', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sites = await prisma.site.findMany();
    const active = await prisma.attendance.findMany({ where: { clockOut: null }, include: { employee: true } });
    res.json({ sites, activeEmployees: active });
  } catch (error) {
    res.status(500).json({ error: 'Tracking failed' });
  }
});

app.get('/api/security/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await prisma.securityAlert.findMany({ orderBy: { timestamp: 'desc' }, take: 20 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Alerts failed' });
  }
});

app.post('/api/security/alerts', authenticateToken, async (req, res) => {
  try {
    const a = await prisma.securityAlert.create({ data: req.body });
    res.status(201).json(a);
  } catch (error) {
    res.status(400).json({ error: 'Alert failed' });
  }
});

let systemConfig = { strictGeofencing: true, biometricRequired: true, notificationsEnabled: true, theme: 'dark' };
app.get('/api/config', authenticateToken, (req, res) => res.json(systemConfig));
app.post('/api/config', authenticateToken, requireAdmin, (req, res) => { systemConfig = { ...systemConfig, ...req.body }; res.json(systemConfig); });

app.get('/health', (req, res) => res.json({ status: 'OK' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
