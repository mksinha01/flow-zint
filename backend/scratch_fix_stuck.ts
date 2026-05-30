import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Fix stuck IN_PROGRESS calls
  const result = await prisma.call.updateMany({
    where: { status: 'IN_PROGRESS' },
    data: { status: 'FAILED', endedAt: new Date() }
  });
  console.log(`Fixed ${result.count} stuck calls → status: FAILED`);

  // Show recent calls now
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, status: true, transcript: true, createdAt: true }
  });
  console.log(JSON.stringify(calls, null, 2));
}
main().finally(() => prisma.$disconnect());
