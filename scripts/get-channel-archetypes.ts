import { prisma } from '../lib/prisma';

async function getChannelArchetypes() {
  try {
    const channelId = 'cmms4ixmf0000pt5ohqtgfqce';

    const channel = await prisma.channels.findUnique({
      where: { id: channelId }
    });

    console.log('Channel:', channel?.name || 'Not found');
    console.log('User ID:', channel?.userId);

    // Get archetypes linked to this channel via channel_archetypes
    const channelArchetypes = await prisma.channel_archetypes.findMany({
      where: { channelId },
      include: {
        archetypes: true
      },
      take: 10
    });

    console.log('\nArchetypes linked to this channel:');
    if (channelArchetypes.length > 0) {
      channelArchetypes.forEach(ca => {
        console.log(`  - ${ca.archetypes.id} | ${ca.archetypes.name} | Category: ${ca.archetypes.category || 'None'}`);
      });
    } else {
      console.log('  No archetypes linked to this channel');
      console.log('\nAll archetypes in database:');

      const allArchetypes = await prisma.archetypes.findMany({ take: 10 });
      allArchetypes.forEach(a => {
        console.log(`  - ${a.id} | ${a.name} | User: ${a.userId || 'None'}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getChannelArchetypes();
