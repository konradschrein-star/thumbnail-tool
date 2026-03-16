const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const archetypes = await prisma.archetype.findMany({
    include: {
      channels: {
        include: {
          channel: {
            select: { name: true }
          }
        }
      }
    }
  });
  
  console.log('Total archetypes found:', archetypes.length);
  const categories = [...new Set(archetypes.map(a => a.category))];
  console.log('Categories:', categories);
  
  archetypes.forEach(a => {
    console.log(`- [${a.category}] ${a.name} (ID: ${a.id}, isAdminOnly: ${a.isAdminOnly}, ownerId: ${a.userId})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
