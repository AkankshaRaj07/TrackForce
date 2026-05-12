import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAvatars() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeId: true,
      avatar: true
    }
  });
  console.log(JSON.stringify(employees, null, 2));
  await prisma.$disconnect();
}

checkAvatars();
