const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start of text
    .replace(/-+$/, '');      // Trim - from end of text
}

async function main() {
  const researchDir = path.join(process.cwd(), 'public', 'research', 'video_analysis');
  if (!fs.existsSync(researchDir)) {
    console.error('Research directory not found:', researchDir);
    return;
  }

  const files = fs.readdirSync(researchDir);
  const fileMap = new Map();
  files.forEach(file => {
    if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
      const slug = slugify(path.parse(file).name);
      fileMap.set(slug, file);
    }
  });

  const archetypes = await prisma.archetype.findMany();

  console.log(`Processing ${archetypes.length} total archetypes...`);

  let fixed = 0;
  let missing = 0;

  for (const arch of archetypes) {
    const archSlug = slugify(arch.name);
    const originalFile = fileMap.get(archSlug);

    if (originalFile) {
      const ext = path.extname(originalFile);
      const newFileName = `${archSlug}${ext}`;
      const newRelativePath = `/research/video_analysis/${newFileName}`;
      
      const srcPath = path.join(researchDir, originalFile);
      const destPath = path.join(researchDir, newFileName);

      // Copy to standardized slug name if it doesn't match exactly
      if (originalFile !== newFileName) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Normalized: "${originalFile}" -> "${newFileName}"`);
      }

      await prisma.archetype.update({
        where: { id: arch.id },
        data: { imageUrl: newRelativePath }
      });
      console.log(`✅ Updated DB: "${arch.name}" -> ${newRelativePath}`);
      fixed++;
    } else {
      console.error(`❌ NOT FOUND: No matching file for "${arch.name}" (searched slug: ${archSlug})`);
      missing++;
    }
  }

  console.log('--- Summary ---');
  console.log(`Total: ${archetypes.length}`);
  console.log(`Fixed/Updated: ${fixed}`);
  console.log(`Missing: ${missing}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
