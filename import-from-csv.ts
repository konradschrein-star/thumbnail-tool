/**
 * Import channels, archetypes, and relationships from CSV files
 */
import { prisma } from './lib/prisma';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const CHANNELS_CSV = './Supabase Snippet Export Core Tables (1).csv';
const ARCHETYPES_CSV = './Supabase Snippet Export Core Tables (3).csv';
const RELATIONSHIPS_CSV = './Supabase Snippet Export Core Tables.csv';

async function main() {
  console.log('📥 Importing data from CSV files...\n');

  // Get admin user
  const adminUser = await prisma.users.findUnique({
    where: { email: 'konrad.schrein@gmail.com' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found');
  }

  console.log(`Using admin user: ${adminUser.email}\n`);

  // 1. Import Channels
  console.log('📺 Importing channels...');
  const channelsData = parse(readFileSync(CHANNELS_CSV), {
    columns: true,
    skip_empty_lines: true,
  });

  const channelIdMap = new Map<string, string>();
  let channelsCreated = 0;

  for (const row of channelsData) {
    try {
      const existing = await prisma.channels.findFirst({
        where: { name: row.name },
      });

      if (existing) {
        console.log(`   ⚠️  Channel exists: ${row.name}`);
        channelIdMap.set(row.id, existing.id);
        continue;
      }

      const newChannel = await prisma.channels.create({
        data: {
          name: row.name,
          personaDescription: row.personaDescription || '',
          personaAssetPath: row.personaAssetPath,
          logoAssetPath: row.logoAssetPath,
          primaryColor: row.primaryColor,
          secondaryColor: row.secondaryColor,
          tags: row.tags,
          userId: adminUser.id,
        },
      });

      channelIdMap.set(row.id, newChannel.id);
      channelsCreated++;
      console.log(`   ✓ ${row.name}`);
    } catch (error: any) {
      console.error(`   ✗ Failed: ${row.name} - ${error.message}`);
    }
  }

  console.log(`   Created ${channelsCreated}/${channelsData.length} channels\n`);

  // 2. Import Archetypes
  console.log('🎨 Importing archetypes...');
  const archetypesData = parse(readFileSync(ARCHETYPES_CSV), {
    columns: true,
    skip_empty_lines: true,
  });

  const archetypeIdMap = new Map<string, string>();
  let archetypesCreated = 0;

  for (const row of archetypesData) {
    try {
      const existing = await prisma.archetypes.findFirst({
        where: { name: row.name },
      });

      if (existing) {
        console.log(`   ⚠️  Archetype exists: ${row.name}`);
        archetypeIdMap.set(row.id, existing.id);
        continue;
      }

      const newArchetype = await prisma.archetypes.create({
        data: {
          name: row.name,
          imageUrl: row.imageUrl || '',
          layoutInstructions: row.layoutInstructions || '',
          basePrompt: row.basePrompt,
          category: row.category || 'General',
          isAdminOnly: row.isAdminOnly === 'true',
          userId: adminUser.id,
        },
      });

      archetypeIdMap.set(row.id, newArchetype.id);
      archetypesCreated++;
      console.log(`   ✓ ${row.name}`);
    } catch (error: any) {
      console.error(`   ✗ Failed: ${row.name} - ${error.message}`);
    }
  }

  console.log(`   Created ${archetypesCreated}/${archetypesData.length} archetypes\n`);

  // 3. Import Relationships
  console.log('🔗 Importing channel-archetype relationships...');
  const relationshipsData = parse(readFileSync(RELATIONSHIPS_CSV), {
    columns: true,
    skip_empty_lines: true,
  });

  let relationshipsCreated = 0;

  for (const row of relationshipsData) {
    try {
      const newChannelId = channelIdMap.get(row.channelId);
      const newArchetypeId = archetypeIdMap.get(row.archetypeId);

      if (!newChannelId || !newArchetypeId) {
        continue; // Skip if channel or archetype wasn't imported
      }

      const existing = await prisma.channel_archetypes.findUnique({
        where: {
          channelId_archetypeId: {
            channelId: newChannelId,
            archetypeId: newArchetypeId,
          },
        },
      });

      if (!existing) {
        await prisma.channel_archetypes.create({
          data: {
            channelId: newChannelId,
            archetypeId: newArchetypeId,
          },
        });
        relationshipsCreated++;
      }
    } catch (error: any) {
      // Skip relationship errors silently
    }
  }

  console.log(`   Created ${relationshipsCreated} relationships\n`);

  console.log('✅ Import complete!\n');
  console.log('Summary:');
  console.log(`  - Channels: ${channelsCreated} imported`);
  console.log(`  - Archetypes: ${archetypesCreated} imported`);
  console.log(`  - Relationships: ${relationshipsCreated} imported`);
  console.log(`  - All owned by: ${adminUser.email}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
