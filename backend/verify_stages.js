const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- ATTENDANCE CHECK ---");
  const logs = await prisma.attendanceLog.findMany({ take: 5, include: { employee: true, site: true } });
  console.log(`Found ${logs.length} logs`);
  logs.forEach(l => console.log(`- ${l.employee.firstName} @ ${l.site?.name || 'Unknown'}: ${l.status}`));

  console.log("\n--- PAYROLL CHECK ---");
  const payouts = await prisma.payrollPayout.findMany({ take: 5, include: { employee: true } });
  console.log(`Found ${payouts.length} payouts`);
  payouts.forEach(p => console.log(`- ID: ${p.id}, Amount: ${p.amount}, Status: ${p.status}`));

  console.log("\n--- SITE CHECK ---");
  const sites = await prisma.site.findMany({ take: 5 });
  console.log(`Found ${sites.length} sites`);
  sites.forEach(s => console.log(`- ${s.name}: ${s.latitude}, ${s.longitude}`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
