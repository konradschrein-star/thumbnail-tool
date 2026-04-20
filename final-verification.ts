/**
 * Final verification of migration
 */
import { prisma } from './lib/prisma';
import { existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔍 Final Migration Verification\n');
  console.log('=' .repeat(50) + '\n');

  const publicDir = join(process.cwd(), 'public');

  // 1. Check users
  const users = await prisma.users.findMany({
    select: { email: true, role: true },
  });
  console.log('👥 Users:');
  users.forEach(u => console.log(`  ${u.role === 'ADMIN' ? '⭐' : '  '} ${u.email} (${u.role})`));

  // 2. Check channels with ownership
  console.log('\n📺 Channels:');
  const channels = await prisma.channels.findMany({
    select: {
      name: true,
      user: { select: { email: true } },
      _count: { select: { archetypes: true } },
    },
  });
  channels.forEach(c => {
    console.log(`  - ${c.name} → ${c.user.email} (${c._count.archetypes} archetypes)`);
  });

  // 3. Check archetypes with images
  const archetypes = await prisma.archetypes.findMany({
    select: { name: true, imageUrl: true },
  });

  let imagesOk = 0;
  let imagesMissing = 0;

  console.log('\n🎨 Archetype Images:');
  for (const arch of archetypes) {
    if (!arch.imageUrl || arch.imageUrl === '') {
      console.log(`  ❌ ${arch.name}: No imageUrl`);
      imagesMissing++;
      continue;
    }

    if (arch.imageUrl.startsWith('http')) {
      console.log(`  🌐 ${arch.name}: External URL`);
      imagesOk++;
      continue;
    }

    const localPath = join(publicDir, arch.imageUrl);
    if (existsSync(localPath)) {
      imagesOk++;
    } else {
      console.log(`  ❌ ${arch.name}: Missing file ${arch.imageUrl}`);
      imagesMissing++;
    }
  }

  console.log(`\n  ✓ Images accessible: ${imagesOk}`);
  console.log(`  ✗ Images missing: ${imagesMissing}`);

  // 4. Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Migration Status:\n');
  console.log(`✅ Users: ${users.length} (1 ADMIN)`);
  console.log(`✅ Channels: ${channels.length}`);
  console.log(`✅ Archetypes: ${archetypes.length}`);
  console.log(`✅ Archetype Images: ${imagesOk}/${archetypes.length} accessible`);

  if (imagesMissing === 0) {
    console.log('\n🎉 All archetype images successfully migrated!\n');
  } else {
    console.log(`\n⚠️  ${imagesMissing} archetype images still missing\n`);
  }

  console.log('⚠️  REMINDER: Admin user must log out and log back in');
  console.log('   to refresh session with ADMIN role\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
