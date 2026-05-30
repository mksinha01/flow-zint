import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, status: true, transcript: true, analysis: true, createdAt: true }
  });
  console.log(JSON.stringify(calls, null, 2));
}
main().finally(() => prisma.$disconnect());
