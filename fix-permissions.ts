/**
 * Fix admin permissions and channel ownership
 */
import { prisma } from './lib/prisma';

async function main() {
  console.log('🔧 Fixing permissions and ownership...\n');

  // 1. List all users
  const users = await prisma.users.findMany({
    select: { id: true, email: true, role: true, name: true },
  });

  console.log('👥 Current Users:');
  users.forEach(user => {
    console.log(`  - ${user.email} (${user.role}) [${user.name || 'no name'}]`);
  });

  // 2. Ensure admin has ADMIN role
  const adminUser = users.find(u => u.email === 'konrad.schrein@gmail.com');
  if (!adminUser) {
    throw new Error('Admin user not found!');
  }

  if (adminUser.role !== 'ADMIN') {
    console.log(`\n⚠️  Admin role is ${adminUser.role}, updating to ADMIN...`);
    await prisma.users.update({
      where: { id: adminUser.id },
      data: { role: 'ADMIN' },
    });
    console.log('✓ Admin role updated');
  } else {
    console.log('\n✓ Admin role is correct');
  }

  // 3. Find Peter's account
  const peterUser = users.find(u => u.email === 'peter@schreinercontentsystems.com');
  if (!peterUser) {
    console.log('\n⚠️  Peter\'s account not found');
  } else {
    console.log(`\n👤 Peter's account: ${peterUser.email} (${peterUser.id})`);
  }

  // 4. Check channel ownership
  const channels = await prisma.channels.findMany({
    select: {
      id: true,
      name: true,
      userId: true,
      user: {
        select: { email: true },
      },
    },
  });

  console.log('\n📺 Current Channel Ownership:');
  channels.forEach(channel => {
    console.log(`  - ${channel.name}: ${channel.user.email}`);
  });

  // 5. Fix ownership based on channel names
  console.log('\n🔄 Fixing channel ownership...');

  // Peters test channel should be owned by Peter
  const petersTestChannel = channels.find(c => c.name === 'Peters test channel');
  if (petersTestChannel && peterUser && petersTestChannel.userId !== peterUser.id) {
    await prisma.channels.update({
      where: { id: petersTestChannel.id },
      data: { userId: peterUser.id },
    });
    console.log('✓ Assigned "Peters test channel" to Peter');
  }

  // Entrepreneur Skool should be owned by admin
  const entrepreneurChannel = channels.find(c => c.name === 'Entrepreneur Skool');
  if (entrepreneurChannel && entrepreneurChannel.userId !== adminUser.id) {
    await prisma.channels.update({
      where: { id: entrepreneurChannel.id },
      data: { userId: adminUser.id },
    });
    console.log('✓ Assigned "Entrepreneur Skool" to admin');
  }

  // Gary, Harry, and Phones should be owned by admin
  const adminChannels = ['Gary Guides You', 'Help From Harry', 'Phones With Peter'];
  for (const channelName of adminChannels) {
    const channel = channels.find(c => c.name === channelName);
    if (channel && channel.userId !== adminUser.id) {
      await prisma.channels.update({
        where: { id: channel.id },
        data: { userId: adminUser.id },
      });
      console.log(`✓ Assigned "${channelName}" to admin`);
    }
  }

  // 6. Check archetype images
  console.log('\n🎨 Checking archetype images...');
  const archetypes = await prisma.archetypes.findMany({
    select: { id: true, name: true, imageUrl: true },
    take: 5,
  });

  console.log('Sample archetype imageUrls:');
  archetypes.forEach(arch => {
    console.log(`  - ${arch.name}: ${arch.imageUrl || 'NULL'}`);
  });

  await prisma.$disconnect();
  console.log('\n✅ Done!');
}

main().catch((e) => {
  console.error('Fix failed:', e);
  process.exit(1);
});
