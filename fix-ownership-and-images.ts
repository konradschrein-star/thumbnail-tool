/**
 * Fix channel ownership and check archetype images
 */
import { prisma } from './lib/prisma';
import { existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔧 Fixing ownership and checking images...\n');

  // Get users
  const adminUser = await prisma.user.findUnique({
    where: { email: 'konrad.schrein@gmail.com' },
  });
  const peterUser = await prisma.user.findUnique({
    where: { email: 'peter@ytavictory.com' },
  });

  if (!adminUser || !peterUser) {
    throw new Error('Users not found');
  }

  // 1. Fix Peters test channel ownership
  const petersChannel = await prisma.channel.findFirst({
    where: { name: 'Peters test channel' },
  });

  if (petersChannel && petersChannel.userId !== peterUser.id) {
    await prisma.channel.update({
      where: { id: petersChannel.id },
      data: { userId: peterUser.id },
    });
    console.log('✓ Assigned "Peters test channel" to peter@ytavictory.com\n');
  }

  // 2. Check archetype images
  console.log('🎨 Checking archetype images...\n');
  const archetypes = await prisma.archetype.findMany({
    select: { id: true, name: true, imageUrl: true },
  });

  let missingCount = 0;
  const publicDir = join(process.cwd(), 'public');

  for (const archetype of archetypes) {
    if (!archetype.imageUrl) {
      console.log(`⚠️  ${archetype.name}: No imageUrl set`);
      missingCount++;
      continue;
    }

    // Check if it's a URL or local path
    if (archetype.imageUrl.startsWith('http')) {
      console.log(`ℹ️  ${archetype.name}: External URL (${archetype.imageUrl})`);
    } else {
      // Check if file exists
      const filePath = join(publicDir, archetype.imageUrl);
      if (!existsSync(filePath)) {
        console.log(`❌ ${archetype.name}: Missing file at ${archetype.imageUrl}`);
        missingCount++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`Total archetypes: ${archetypes.length}`);
  console.log(`Missing/broken images: ${missingCount}`);

  // 3. Check what archetype image files actually exist
  console.log('\n📁 Checking filesystem for archetype images...');
  const archetypeDir = join(publicDir, 'archetypes');
  if (existsSync(archetypeDir)) {
    const { readdirSync } = require('fs');
    const files = readdirSync(archetypeDir);
    console.log(`Found ${files.length} files in /public/archetypes/:`);
    files.slice(0, 10).forEach((file: string) => console.log(`  - ${file}`));
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more`);
    }
  } else {
    console.log('❌ /public/archetypes/ directory does not exist');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fix failed:', e);
  process.exit(1);
});
