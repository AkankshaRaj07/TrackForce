import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('💎 Starting Premium Seed...');

  // 1. Clear existing data
  await prisma.securityAlert.deleteMany();
  await prisma.break.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.tracking.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.site.deleteMany();


  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Create Sites
  const sitesData = [
    { name: 'North Hub HQ', location: 'New Delhi, India', managerName: 'Rajesh Kumar', latitude: 28.6139, longitude: 77.2090 },
    { name: 'South Coast Facility', location: 'Chennai, India', managerName: 'Ananya Iyer', latitude: 13.0827, longitude: 80.2707 },
    { name: 'West Logistics Center', location: 'Mumbai, India', managerName: 'Vikram Mehta', latitude: 19.0760, longitude: 72.8777 },
    { name: 'East Manufacturing Plant', location: 'Kolkata, India', managerName: 'Debraj Das', latitude: 22.5726, longitude: 88.3639 },
    { name: 'Central Research Lab', location: 'Bangalore, India', managerName: 'Sanya Mirza', latitude: 12.9716, longitude: 77.5946 },
  ];

  const sites: any[] = [];
  for (const s of sitesData) {
    const site = await prisma.site.create({ data: s });
    sites.push(site);
  }
  console.log(`✅ Created ${sites.length} operational sites.`);

  // 3. Create Employees
  const employeesData = [
    { employeeId: 'TF001', firstName: 'Admin', lastName: 'User', email: 'admin@trackforce.com', role: 'ADMIN', designation: 'General Manager', siteId: sites[0].id, rate: 150000 },
    { employeeId: 'TF002', firstName: 'Sarah', lastName: 'Jenkins', email: 'sarah.j@trackforce.com', role: 'MANAGER', designation: 'Site Manager', siteId: sites[1].id, rate: 85000 },
    { employeeId: 'TF003', firstName: 'Michael', lastName: 'Chen', email: 'm.chen@trackforce.com', role: 'EMPLOYEE', designation: 'Field Supervisor', siteId: sites[1].id, rate: 55000 },
    { employeeId: 'TF004', firstName: 'Aarav', lastName: 'Sharma', email: 'aarav.s@trackforce.com', role: 'EMPLOYEE', designation: 'Logistics Lead', siteId: sites[2].id, rate: 45000 },
    { employeeId: 'TF005', firstName: 'Elena', lastName: 'Rodriguez', email: 'elena.r@trackforce.com', role: 'EMPLOYEE', designation: 'Quality Analyst', siteId: sites[3].id, rate: 48000 },
    { employeeId: 'TF006', firstName: 'David', lastName: 'Smith', email: 'd.smith@trackforce.com', role: 'EMPLOYEE', designation: 'Safety Officer', siteId: sites[4].id, rate: 52000 },
    { employeeId: 'TF007', firstName: 'Priya', lastName: 'Verma', email: 'p.verma@trackforce.com', role: 'MANAGER', designation: 'Research Head', siteId: sites[4].id, rate: 95000 },
    { employeeId: 'TF008', firstName: 'Liam', lastName: 'Nguyen', email: 'l.nguyen@trackforce.com', role: 'EMPLOYEE', designation: 'Technician', siteId: sites[0].id, rate: 40000 },
    { employeeId: 'TF009', firstName: 'Fatima', lastName: 'Zahra', email: 'f.zahra@trackforce.com', role: 'EMPLOYEE', designation: 'Assembler', siteId: sites[3].id, rate: 35000 },
    { employeeId: 'TF010', firstName: 'Oscar', lastName: 'Isaac', email: 'o.isaac@trackforce.com', role: 'EMPLOYEE', designation: 'Warehouse Staff', siteId: sites[2].id, rate: 38000 },
  ];

  const employees: any[] = [];
  for (const e of employeesData) {
    const emp = await prisma.employee.create({
      data: {
        employeeId: e.employeeId,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        password: hashedPassword,
        role: e.role,
        designation: e.designation,
        siteId: e.siteId,
        hourlyRate: e.rate,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${e.firstName}`,
        isBiometricEnrolled: true,
      }
    });
    employees.push(emp);
  }
  console.log(`✅ Created ${employees.length} workforce members.`);

  // 4. Create Attendance Logs (Past 7 Days)
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT']; // Biased towards PRESENT
  let logsCount = 0;

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    for (const emp of employees) {
      // Skip weekend for some
      if ((date.getDay() === 0 || date.getDay() === 6) && Math.random() > 0.3) continue;

      const clockInTime = new Date(date);
      clockInTime.setHours(8, Math.floor(Math.random() * 45), 0);
      
      const clockOutTime = new Date(date);
      clockOutTime.setHours(17, Math.floor(Math.random() * 30), 0);

      const status = statuses[Math.floor(Math.random() * statuses.length)];

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          siteId: emp.siteId,
          date: date,
          clockIn: clockInTime,
          clockOut: clockOutTime,
          status: status,
          biometricProof: `https://api.dicebear.com/7.x/identicon/svg?seed=${emp.id}-${i}`,
          clockInLat: sites.find(s => s.id === emp.siteId)?.latitude || 0,
          clockInLong: sites.find(s => s.id === emp.siteId)?.longitude || 0,
        }
      });
      logsCount++;
    }
  }
  console.log(`✅ Generated ${logsCount} attendance records.`);

  // 5. Create Security Alerts
  const alertTypes = ['BIOMETRIC_MISMATCH', 'GEOFENCE_VIOLATION', 'UNAUTHORIZED_ACCESS'];
  const severities = ['LOW', 'MEDIUM', 'HIGH'];

  for (let i = 0; i < 10; i++) {
    const randomEmp = employees[Math.floor(Math.random() * employees.length)];
    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    
    await prisma.securityAlert.create({
      data: {
        type: type,
        message: `${type.replace('_', ' ')} detected for ${randomEmp.firstName} ${randomEmp.lastName} at hub.`,
        severity: severities[Math.floor(Math.random() * severities.length)],
        employeeId: randomEmp.id,
        siteId: randomEmp.siteId,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
      }
    });
  }
  console.log(`✅ Created 10 high-priority security alerts.`);

  // 6. Create Tracking Data
  for (const emp of employees) {
    const baseLat = sites.find(s => s.id === emp.siteId)?.latitude || 0;
    const baseLong = sites.find(s => s.id === emp.siteId)?.longitude || 0;

    for (let i = 0; i < 5; i++) {
      await prisma.tracking.create({
        data: {
          employeeId: emp.id,
          latitude: baseLat + (Math.random() - 0.5) * 0.01,
          longitude: baseLong + (Math.random() - 0.5) * 0.01,
          timestamp: new Date(),
        }
      });
    }
  }
  console.log(`✅ Populated live GPS tracking nodes.`);

  console.log('🚀 Premium Database Population Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
