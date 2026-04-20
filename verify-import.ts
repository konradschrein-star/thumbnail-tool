/**
 * Verify CSV import results
 */
import { prisma } from './lib/prisma';

async function main() {
  const channelCount = await prisma.channels.count();
  const archetypeCount = await prisma.archetypes.count();
  const relationshipCount = await prisma.channel_archetypes.count();

  const adminUser = await prisma.users.findUnique({
    where: { email: 'konrad.schrein@gmail.com' },
    select: { id: true, role: true },
  });

  const adminChannels = await prisma.channels.count({
    where: { userId: adminUser?.id },
  });

  console.log('\n📊 Database Verification:\n');
  console.log(`Total Channels: ${channelCount}`);
  console.log(`Total Archetypes: ${archetypeCount}`);
  console.log(`Total Relationships: ${relationshipCount}`);
  console.log(`\nAdmin Account: konrad.schrein@gmail.com`);
  console.log(`Admin Role: ${adminUser?.role}`);
  console.log(`Channels owned by admin: ${adminChannels}`);

  // List all channels
  const channels = await prisma.channels.findMany({
    include: {
      _count: {
        select: {
          channel_archetypes: true,
        },
      },
    },
  });

  console.log('\n📺 Channels:');
  channels.forEach((channel) => {
    console.log(`  - ${channel.name} (${channel._count.channel_archetypes} archetypes)`);
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
