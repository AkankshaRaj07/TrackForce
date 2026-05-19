import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      role: true,
      plainPassword: true
    }
  });
  console.log(JSON.stringify(employees, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
