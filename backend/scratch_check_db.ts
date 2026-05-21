import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const configs = await prisma.agentConfig.findMany({
    orderBy: { generatedAt: 'desc' },
    take: 5
  });
  console.log('Recent Agent Configs:', JSON.stringify(configs, null, 2));

  const contexts = await prisma.businessContext.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  console.log('Recent Business Contexts:', JSON.stringify(contexts, null, 2));
}
main().finally(() => prisma.$disconnect());
