const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      status: true,
      livekitRoomId: true,
      createdAt: true,
      endedAt: true,
      transcript: true
    }
  });
  console.log('Recent Calls:', JSON.stringify(calls, null, 2));
}
main().finally(() => prisma.$disconnect());
