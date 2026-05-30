import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      lead: true,
      agentConfig: true,
    }
  });
  console.log('Recent Calls:', JSON.stringify(calls, null, 2));
}
main().finally(() => prisma.$disconnect());
