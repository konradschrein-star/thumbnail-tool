const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Making Research Archetypes visible to non-admins ---');
  const result = await prisma.archetype.updateMany({
    where: { category: 'Research' },
    data: { isAdminOnly: false }
  });
  console.log('Updated visibility for:', result.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
