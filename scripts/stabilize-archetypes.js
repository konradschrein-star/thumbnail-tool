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
  const sourceDir = path.join(process.cwd(), 'research', 'video_analysis');
  const publicDir = path.join(process.cwd(), 'frontend', 'public', 'research', 'video_analysis');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  if (!fs.existsSync(sourceDir)) {
    console.error('Source research directory not found:', sourceDir);
    return;
  }

  // Get all subdirectories in sourceDir
  const folders = fs.readdirSync(sourceDir).filter(f => 
    fs.statSync(path.join(sourceDir, f)).isDirectory()
  );

  const archetypes = await prisma.archetype.findMany();

  console.log(`Processing ${archetypes.length} total archetypes...`);


  let fixed = 0;
  let missing = 0;

  for (const arch of archetypes) {
    const archSlug = slugify(arch.name);
    let sourcePath = null;

    // 1. Try to find a matching folder with folder.jpg or any image
    const matchingFolder = folders.find(f => slugify(f).startsWith(archSlug) || archSlug.startsWith(slugify(f)));
    if (matchingFolder) {
      const folderPath = path.join(sourceDir, matchingFolder);
      const folderImg = path.join(folderPath, 'folder.jpg');
      if (fs.existsSync(folderImg)) {
        sourcePath = folderImg;
      } else {
        // Look for any image file in the folder
        const innerFiles = fs.readdirSync(folderPath);
        const anyImg = innerFiles.find(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png'));
        if (anyImg) {
          sourcePath = path.join(folderPath, anyImg);
        }
      }
    }

    // 2. If not found, try to find a matching loose file in sourceDir or publicDir (as fallback)
    if (!sourcePath) {
       // Check for any loose files in sourceDir that might match
       const looseFiles = fs.readdirSync(sourceDir).filter(f => !fs.statSync(path.join(sourceDir, f)).isDirectory());
       const matchingFile = looseFiles.find(f => slugify(path.parse(f).name) === archSlug);
       if (matchingFile) {
         sourcePath = path.join(sourceDir, matchingFile);
       }
    }

    if (sourcePath) {
      const newFileName = `${archSlug}.jpg`;
      const destPath = path.join(publicDir, newFileName);
      const newRelativePath = `/research/video_analysis/${newFileName}`;
      
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Standardized: "${arch.name}" -> ${newRelativePath}`);

      await prisma.archetype.update({
        where: { id: arch.id },
        data: { imageUrl: newRelativePath }
      });
      fixed++;
    } else {
      if (arch.category === 'Research') {
        console.error(`❌ NOT FOUND: No source image for "${arch.name}" (Slug: ${archSlug})`);
        missing++;
      }
    }
  }

  console.log('--- Summary ---');
  console.log(`Total Archetypes: ${archetypes.length}`);
  console.log(`Fixed/Standardized: ${fixed}`);
  console.log(`Missing (Research only): ${missing}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
