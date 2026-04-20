const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function main() {
  const publicDir = path.join(process.cwd(), 'frontend', 'public', 'research', 'video_analysis');
  const archetypes = await prisma.archetype.findMany({
    where: { category: 'Research' }
  });

  console.log(`Auditing ${archetypes.length} Research archetypes...`);

  for (const arch of archetypes) {
    const slug = slugify(arch.name);
    const expectedFile = `${slug}.jpg`;
    const fullPath = path.join(publicDir, expectedFile);
    
    if (fs.existsSync(fullPath)) {
      console.log(`✅ FOUND: "${arch.name}" -> ${expectedFile}`);
    } else {
      console.log(`❌ ERROR: "${arch.name}" -> ${expectedFile} (MISSING)`);
      // Also check if imageUrl matches
      if (arch.imageUrl !== `/research/video_analysis/${expectedFile}`) {
        console.log(`   - DB mismatch! Current imageUrl: ${arch.imageUrl}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
