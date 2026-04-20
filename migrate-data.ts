/**
 * Migrate channels and archetypes from old Vercel/Supabase database
 */
import { PrismaClient } from '@prisma/client';

// Old database connection
const oldDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.ezgtctlpeuhpzmbysxqm:Hko1eMEwcSE1kSHAR6pjl@db.ezgtctlpeuhpzmbysxqm.supabase.co:5432/postgres',
    },
  },
});

// New database connection (use current DATABASE_URL from .env)
const newDb = new PrismaClient();

async function main() {
  console.log('🔄 Migrating data from old database...\n');

  // Get admin user ID (konrad.schrein@gmail.com) in new database
  const adminUser = await newDb.users.findUnique({
    where: { email: 'konrad.schrein@gmail.com' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found in new database');
  }

  console.log(`Using admin user: ${adminUser.email} (${adminUser.id})\n`);

  // 1. Migrate Channels
  console.log('📺 Migrating channels...');
  const oldChannels = await oldDb.channels.findMany();
  console.log(`   Found ${oldChannels.length} channels in old database`);

  let channelsCreated = 0;
  const channelIdMap = new Map<string, string>(); // old ID -> new ID

  for (const channel of oldChannels) {
    try {
      // Check if channel already exists (by name)
      const existing = await newDb.channels.findFirst({
        where: { name: channel.name },
      });

      if (existing) {
        console.log(`   ⚠️  Channel exists: ${channel.name} - skipping`);
        channelIdMap.set(channel.id, existing.id);
        continue;
      }

      // Create channel with admin as owner
      const newChannel = await newDb.channels.create({
        data: {
          name: channel.name,
          personaDescription: channel.personaDescription,
          personaAssetPath: channel.personaAssetPath,
          logoAssetPath: channel.logoAssetPath,
          primaryColor: channel.primaryColor,
          secondaryColor: channel.secondaryColor,
          tags: channel.tags,
          userId: adminUser.id, // Assign to admin
        },
      });

      channelIdMap.set(channel.id, newChannel.id);
      channelsCreated++;
      console.log(`   ✓ ${channel.name}`);
    } catch (error: any) {
      console.error(`   ✗ Failed to migrate channel ${channel.name}:`, error.message);
    }
  }

  console.log(`   Created ${channelsCreated}/${oldChannels.length} channels\n`);

  // 2. Migrate Archetypes
  console.log('🎨 Migrating archetypes...');
  const oldArchetypes = await oldDb.archetypes.findMany();
  console.log(`   Found ${oldArchetypes.length} archetypes in old database`);

  let archetypesCreated = 0;

  for (const archetype of oldArchetypes) {
    try {
      // Check if archetype already exists (by name)
      const existing = await newDb.archetypes.findFirst({
        where: { name: archetype.name },
      });

      if (existing) {
        console.log(`   ⚠️  Archetype exists: ${archetype.name} - skipping`);
        continue;
      }

      // Create archetype with admin as owner
      await newDb.archetypes.create({
        data: {
          name: archetype.name,
          imageUrl: archetype.imageUrl,
          layoutInstructions: archetype.layoutInstructions,
          basePrompt: archetype.basePrompt,
          category: archetype.category,
          isAdminOnly: archetype.isAdminOnly,
          userId: adminUser.id, // Assign to admin
        },
      });

      archetypesCreated++;
      console.log(`   ✓ ${archetype.name}`);
    } catch (error: any) {
      console.error(`   ✗ Failed to migrate archetype ${archetype.name}:`, error.message);
    }
  }

  console.log(`   Created ${archetypesCreated}/${oldArchetypes.length} archetypes\n`);

  // 3. Migrate Channel-Archetype relationships (if they exist)
  try {
    const oldRelations = await oldDb.channel_archetypes.findMany();
    console.log(`🔗 Migrating ${oldRelations.length} channel-archetype relationships...`);

    let relationsCreated = 0;
    for (const relation of oldRelations) {
      try {
        const newChannelId = channelIdMap.get(relation.channelId);
        if (!newChannelId) continue; // Channel wasn't migrated

        const newArchetype = await newDb.archetypes.findFirst({
          where: {
            name: (await oldDb.archetypes.findUnique({ where: { id: relation.archetypeId } }))?.name
          },
        });

        if (!newArchetype) continue; // Archetype wasn't migrated

        // Check if relationship already exists
        const existingRelation = await newDb.channel_archetypes.findUnique({
          where: {
            channelId_archetypeId: {
              channelId: newChannelId,
              archetypeId: newArchetype.id,
            },
          },
        });

        if (!existingRelation) {
          await newDb.channel_archetypes.create({
            data: {
              channelId: newChannelId,
              archetypeId: newArchetype.id,
            },
          });
          relationsCreated++;
        }
      } catch (error: any) {
        // Ignore relationship errors
      }
    }
    console.log(`   Created ${relationsCreated} relationships\n`);
  } catch (error) {
    console.log('   ⚠️  No channel-archetype relationships table in old database\n');
  }

  console.log('✅ Migration complete!\n');
  console.log('Summary:');
  console.log(`  - Channels: ${channelsCreated} created`);
  console.log(`  - Archetypes: ${archetypesCreated} created`);
  console.log(`  - All data assigned to: ${adminUser.email}`);

  await oldDb.$disconnect();
  await newDb.$disconnect();
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
