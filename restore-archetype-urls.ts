/**
 * Restore archetype imageUrl values from CSV
 */
import { prisma } from './lib/prisma';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const ARCHETYPES_CSV = './archetypes_rows.csv';

async function main() {
  console.log('🔧 Restoring archetype imageUrl values from CSV...\n');

  // Read CSV
  const csvData = parse(readFileSync(ARCHETYPES_CSV), {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${csvData.length} archetypes in CSV\n`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const row of csvData) {
    try {
      // Find archetype by name
      const archetype = await prisma.archetype.findFirst({
        where: { name: row.name },
      });

      if (!archetype) {
        console.log(`⚠️  Not found in DB: ${row.name}`);
        notFoundCount++;
        continue;
      }

      // Update imageUrl if it's different
      if (archetype.imageUrl !== row.imageUrl) {
        await prisma.archetype.update({
          where: { id: archetype.id },
          data: { imageUrl: row.imageUrl },
        });
        console.log(`✓ Updated: ${row.name} → ${row.imageUrl}`);
        updatedCount++;
      } else {
        console.log(`ℹ️  Already correct: ${row.name}`);
      }
    } catch (error: any) {
      console.error(`✗ Failed: ${row.name} - ${error.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✓ Updated: ${updatedCount}`);
  console.log(`⚠️  Not found: ${notFoundCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Restore failed:', e);
  process.exit(1);
});
