/**
 * fix-archetype-images.js
 * ─────────────────────────────────────────────────────────────────
 * Fixes broken archetype reference images by:
 * 1. Renaming files in public/research/video_analysis/ to URL-safe slugs
 * 2. Updating the imageUrl in the database to match
 * ─────────────────────────────────────────────────────────────────
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Converts a string to a URL-safe slug.
 * "you need to learn SQL RIGHT NOW!! (SQL Tutorial for Beginners)"
 * → "you-need-to-learn-sql-right-now-sql-tutorial-for-beginners"
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[？｜–]/g, '-')          // Full-width special chars → hyphen
    .replace(/[^a-z0-9\s-]/g, '')      // Remove all non-alphanumeric except spaces/hyphens
    .replace(/\s+/g, '-')              // Spaces → hyphens
    .replace(/-+/g, '-')               // Collapse multiple hyphens
    .replace(/^-|-$/g, '');            // Trim leading/trailing hyphens
}

const publicDir = path.join(process.cwd(), 'public', 'research', 'video_analysis');

async function main() {
  console.log('🔧 Fix Archetype Reference Images\n');
  console.log(`Public dir: ${publicDir}\n`);

  // 1. Fetch all archetypes with /research/ URLs
  const archetypes = await prisma.archetype.findMany({
    where: {
      imageUrl: { startsWith: '/research/' },
    },
  });

  console.log(`Found ${archetypes.length} archetypes with /research/ image URLs.\n`);

  let fixedCount = 0;
  let alreadyOkCount = 0;
  let errorCount = 0;

  for (const arch of archetypes) {
    const oldUrl = arch.imageUrl;
    // Extract the filename from the URL: /research/video_analysis/Something.jpg → Something.jpg
    const oldFilename = path.basename(oldUrl);
    const nameWithoutExt = path.parse(oldFilename).name;
    const ext = path.parse(oldFilename).ext || '.jpg';

    // Create sanitized slug
    const slug = slugify(nameWithoutExt);
    const newFilename = `${slug}${ext}`;
    const newUrl = `/research/video_analysis/${newFilename}`;

    const oldFilePath = path.join(publicDir, oldFilename);
    const newFilePath = path.join(publicDir, newFilename);

    // Also check for the file inside a subdirectory (some are nested)
    const nestedFilePath = path.join(publicDir, nameWithoutExt, oldFilename);

    console.log(`─── ${arch.name} ───`);
    console.log(`  DB URL:   ${oldUrl}`);
    console.log(`  Slug:     ${newFilename}`);

    // Check if the new file already exists (already fixed or slug collision)
    if (fs.existsSync(newFilePath)) {
      // File with safe name already exists — just update DB
      console.log(`  ✅ File already exists at safe path`);
      if (oldUrl !== newUrl) {
        await prisma.archetype.update({
          where: { id: arch.id },
          data: { imageUrl: newUrl },
        });
        console.log(`  ✅ DB updated: ${newUrl}`);
        fixedCount++;
      } else {
        console.log(`  ⏭️  Already correct`);
        alreadyOkCount++;
      }
      continue;
    }

    // Try to find the source file
    let sourceFile = null;
    if (fs.existsSync(oldFilePath)) {
      sourceFile = oldFilePath;
    } else if (fs.existsSync(nestedFilePath)) {
      sourceFile = nestedFilePath;
    } else {
      // Search more broadly — the file might be named slightly differently
      // Try matching by slug in existing files
      const existingFiles = fs.readdirSync(publicDir).filter(f => f.endsWith(ext));
      const match = existingFiles.find(f => {
        const fSlug = slugify(path.parse(f).name);
        return fSlug === slug;
      });
      if (match) {
        sourceFile = path.join(publicDir, match);
      }
    }

    if (sourceFile) {
      // Copy (not rename) to safe filename so originals aren't lost
      fs.copyFileSync(sourceFile, newFilePath);
      console.log(`  ✅ Copied: ${path.basename(sourceFile)} → ${newFilename}`);

      await prisma.archetype.update({
        where: { id: arch.id },
        data: { imageUrl: newUrl },
      });
      console.log(`  ✅ DB updated: ${newUrl}`);
      fixedCount++;
    } else {
      console.log(`  ❌ Source file NOT FOUND`);
      console.log(`     Checked: ${oldFilePath}`);
      console.log(`     Checked: ${nestedFilePath}`);
      errorCount++;
    }

    console.log('');
  }

  console.log('═'.repeat(60));
  console.log('📊 Summary');
  console.log('═'.repeat(60));
  console.log(`  ✅ Fixed:       ${fixedCount}`);
  console.log(`  ⏭️  Already OK:  ${alreadyOkCount}`);
  console.log(`  ❌ Errors:      ${errorCount}`);
  console.log(`  Total:          ${archetypes.length}`);

  if (errorCount === 0) {
    console.log('\n🎉 All archetype images should now load correctly!');
  } else {
    console.log(`\n⚠️  ${errorCount} archetype(s) still have missing image files.`);
    console.log('    These may need to be manually uploaded via the dashboard.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
