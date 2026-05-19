import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const siteNames = [
  'Lakeside Logistics Hub',
  'Skyline Corporate Park',
  'Green Valley Manufacturing',
  'Oceanic Shipping Terminal',
  'Desert Rose Tech Park'
];

const locations = [
  'Chicago, IL',
  'New York, NY',
  'Austin, TX',
  'Miami, FL',
  'Phoenix, AZ'
];

const managerNames = [
  { first: 'James', last: 'Wilson' },
  { first: 'Maria', last: 'Garcia' },
  { first: 'Robert', last: 'Miller' },
  { first: 'Patricia', last: 'Davis' },
  { first: 'Michael', last: 'Rodriguez' }
];

const firstNames = [
  'John', 'Jane', 'Alex', 'Emily', 'Chris', 'Katie', 'David', 'Sarah', 'Brian', 'Megan',
  'Kevin', 'Laura', 'Steven', 'Linda', 'Paul', 'Karen', 'Mark', 'Susan', 'George', 'Nancy',
  'Thomas', 'Betty', 'Edward', 'Lisa', 'Daniel', 'Dorothy', 'William', 'Alice', 'Richard', 'Carol'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const designations = [
  'Field Technician',
  'Inventory Specialist',
  'Safety Coordinator',
  'Quality Control',
  'Logistics Associate',
  'Operations Assistant',
  'Maintenance Engineer',
  'Warehouse Supervisor'
];

async function main() {
  console.log('🌱 Starting Comprehensive Seeding...');

  // 1. Clear existing data
  console.log('🧹 Cleaning database...');
  await prisma.securityAlert.deleteMany();
  await prisma.break.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.tracking.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.site.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Create Admin
  console.log('👑 Creating Admin...');
  const admin = await prisma.employee.create({
    data: {
      employeeId: 'TF001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@trackforce.com',
      password: hashedPassword,
      plainPassword: 'password123',
      role: 'ADMIN',
      designation: 'Platform Administrator',
      isBiometricEnrolled: true,
      status: 'ACTIVE'
    }
  });

  const allEmployees: any[] = [];
  const sites: any[] = [];

  // 3. Create Sites, Managers, and Employees
  console.log('🏗️ Building Sites and Workforce...');
  let empCounter = 2; // Start from TF002

  for (let i = 0; i < 5; i++) {
    // Create Site
    const site = await prisma.site.create({
      data: {
        name: siteNames[i],
        location: locations[i],
        managerName: `${managerNames[i].first} ${managerNames[i].last}`,
        latitude: 34.0522 + (Math.random() - 0.5) * 5,
        longitude: -118.2437 + (Math.random() - 0.5) * 5,
        geofenceRadius: 300
      }
    });
    sites.push(site);

    // Create Manager for this site
    const manager = await prisma.employee.create({
      data: {
        employeeId: `TF${empCounter.toString().padStart(3, '0')}`,
        firstName: managerNames[i].first,
        lastName: managerNames[i].last,
        email: `${managerNames[i].first.toLowerCase()}.${managerNames[i].last.toLowerCase()}@trackforce.com`,
        password: hashedPassword,
        plainPassword: 'password123',
        role: 'MANAGER',
        designation: 'Site Manager',
        siteId: site.id,
        hourlyRate: 85,
        isBiometricEnrolled: true,
        phone: `+1 555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`
      }
    });
    allEmployees.push(manager);
    empCounter++;

    // Create 10 Employees for this site
    for (let j = 0; j < 10; j++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      const employee = await prisma.employee.create({
        data: {
          employeeId: `TF${empCounter.toString().padStart(3, '0')}`,
          firstName: fName,
          lastName: lName,
          email: `${fName.toLowerCase()}.${lName.toLowerCase()}.${empCounter}@trackforce.com`,
          password: hashedPassword,
          plainPassword: 'password123',
          role: 'EMPLOYEE',
          designation: designations[Math.floor(Math.random() * designations.length)],
          siteId: site.id,
          hourlyRate: 25 + Math.floor(Math.random() * 15),
          isBiometricEnrolled: Math.random() > 0.1, // 90% enrolled
          phone: `+1 555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`
        }
      });
      allEmployees.push(employee);
      empCounter++;
    }
  }

  console.log(`✅ Created 5 sites and ${allEmployees.length} staff members.`);

  // 4. Generate Attendance (Last 14 Days)
  console.log('📅 Generating 14 days of attendance data...');
  let attendanceCount = 0;
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT'];

  for (let d = 13; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);

    // Skip Sundays for most
    const isSunday = date.getDay() === 0;

    for (const emp of allEmployees) {
      if (isSunday && Math.random() > 0.1) continue;
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      if (status === 'ABSENT' && Math.random() > 0.3) continue; // Realistically some skip

      const clockIn = new Date(date);
      clockIn.setHours(status === 'LATE' ? 9 : 8, Math.floor(Math.random() * 30), 0);
      
      const clockOut = new Date(date);
      clockOut.setHours(17, Math.floor(Math.random() * 45), 0);

      const site = sites.find(s => s.id === emp.siteId);

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          siteId: emp.siteId,
          date: date,
          clockIn: clockIn,
          clockOut: status === 'ABSENT' ? null : clockOut,
          status: status,
          clockInLat: site?.latitude ? site.latitude + (Math.random() - 0.5) * 0.001 : 0,
          clockInLong: site?.longitude ? site.longitude + (Math.random() - 0.5) * 0.001 : 0,
          biometricProof: status !== 'ABSENT' ? `proof_token_${Math.random().toString(36).substring(7)}` : null
        }
      });
      attendanceCount++;
    }
  }
  console.log(`✅ Generated ${attendanceCount} attendance logs.`);

  // 5. Generate Tracking Points (Current positions)
  console.log('📍 Seeding current tracking data...');
  for (const emp of allEmployees) {
    const site = sites.find(s => s.id === emp.siteId);
    if (!site) continue;

    for (let p = 0; p < 5; p++) {
      await prisma.tracking.create({
        data: {
          employeeId: emp.id,
          latitude: (site.latitude || 0) + (Math.random() - 0.5) * 0.02,
          longitude: (site.longitude || 0) + (Math.random() - 0.5) * 0.02,
          timestamp: new Date(Date.now() - p * 1000 * 60 * 30) // Points every 30 mins
        }
      });
    }
  }

  // 6. Generate Security Alerts
  console.log('🚨 Creating security alerts...');
  const alertTypes = ['GEOFENCE_VIOLATION', 'BIOMETRIC_MISMATCH', 'UNAUTHORIZED_ZONE'];
  for (let i = 0; i < 15; i++) {
    const emp = allEmployees[Math.floor(Math.random() * allEmployees.length)];
    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    
    await prisma.securityAlert.create({
      data: {
        type: type,
        message: `${type.replace('_', ' ')}: Employee ${emp.firstName} ${emp.lastName} triggered a threshold alert.`,
        severity: Math.random() > 0.8 ? 'HIGH' : (Math.random() > 0.5 ? 'MEDIUM' : 'LOW'),
        employeeId: emp.id,
        siteId: emp.siteId,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 3)) // Alerts within last 3 days
      }
    });
  }

  console.log('🏁 Seeding complete! TrackForce is now ready with a full workforce.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
