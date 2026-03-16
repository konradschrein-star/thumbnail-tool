const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const archetypes = await prisma.archetype.findMany();
  const counts = {};
  archetypes.forEach(a => {
    counts[a.category] = (counts[a.category] || 0) + 1;
  });
  console.log('Archetype Counts by Category:');
  console.log(JSON.stringify(counts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
