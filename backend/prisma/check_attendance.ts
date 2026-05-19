import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.attendance.count();
  console.log(`Total attendance records: ${count}`);

  const recent = await prisma.attendance.findMany({
    take: 10,
    orderBy: { date: 'desc' },
    include: {
      employee: {
        select: { firstName: true, lastName: true }
      }
    }
  });

  console.log('Recent 10 records:');
  console.log(JSON.stringify(recent, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
