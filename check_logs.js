const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employeeId = 'clz07z6i20000z6l4r0u5y1j2'; // Replace with real ID if known, or find Ressa Ocks
  const ressa = await prisma.employee.findFirst({
    where: { firstName: 'Ressa' }
  });
  
  if (!ressa) {
    console.log('Ressa not found');
    return;
  }

  const logs = await prisma.attendance.findMany({
    where: { employeeId: ressa.id }
  });

  console.log('LOGS_FOUND:', JSON.stringify(logs, null, 2));
}

main();
