import { prisma } from '../lib/prisma';

async function getTestData() {
  try {
    const channels = await prisma.channels.findMany({ take: 1 });
    const archetypes = await prisma.archetypes.findMany({ take: 1 });

    console.log('CHANNEL_ID=' + (channels[0]?.id || 'NONE'));
    console.log('CHANNEL_NAME=' + (channels[0]?.name || 'NONE'));
    console.log('ARCHETYPE_ID=' + (archetypes[0]?.id || 'NONE'));
    console.log('ARCHETYPE_NAME=' + (archetypes[0]?.name || 'NONE'));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTestData();
