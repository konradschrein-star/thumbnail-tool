/**
 * Fix broken archetype imageUrl values from old deployment
 */
import { prisma } from './lib/prisma';
import { existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔧 Fixing archetype image URLs...\n');

  const archetypes = await prisma.archetypes.findMany({
    select: { id: true, name: true, imageUrl: true },
  });

  const publicDir = join(process.cwd(), 'public');
  let fixedCount = 0;

  for (const archetype of archetypes) {
    if (!archetype.imageUrl) {
      continue;
    }

    // Skip external URLs
    if (archetype.imageUrl.startsWith('http')) {
      continue;
    }

    // Check if local file exists
    const filePath = join(publicDir, archetype.imageUrl);
    if (!existsSync(filePath)) {
      // Set to empty string if file doesn't exist
      await prisma.archetypes.update({
        where: { id: archetype.id },
        data: { imageUrl: '' },
      });
      console.log(`✓ Cleared broken URL for: ${archetype.name}`);
      fixedCount++;
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} broken image URLs`);
  console.log('\nℹ️  These archetypes will need reference images re-uploaded through the web interface.');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fix failed:', e);
  process.exit(1);
});
