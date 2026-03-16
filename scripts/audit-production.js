const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Production Database Archetype Audit ---');
  const count = await prisma.archetype.count();
  console.log('Total Archetypes:', count);

  const archetypes = await prisma.archetype.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      isAdminOnly: true,
      userId: true,
      imageUrl: true,
    }
  });

  console.table(archetypes);

  const channels = await prisma.channel.findMany({ select: { id: true, name: true } });
  console.log('\nChannels:', channels.map(c => c.name).join(', '));

  for (const a of archetypes) {
    const linkCount = await prisma.channelArchetype.count({ where: { archetypeId: a.id } });
    console.log(`[${a.name}] is linked to ${linkCount} channels.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
