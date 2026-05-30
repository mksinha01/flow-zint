import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { analysis: true }
  });
  for (const call of calls) {
    console.log('=== CALL ===');
    console.log('ID:', call.id);
    console.log('Status:', call.status);
    console.log('CreatedAt:', call.createdAt);
    console.log('EndedAt:', call.endedAt);
    console.log('Transcript (first 300 chars):', call.transcript?.substring(0, 300) ?? 'null');
    console.log('Analysis:', call.analysis ? JSON.stringify(call.analysis, null, 2) : 'null');
    console.log('');
  }
}
main().finally(() => prisma.$disconnect());
