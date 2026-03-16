/**
 * seed-production-archetypes.js
 * Exports local research archetypes as JSON, then seeds them to whatever
 * DATABASE_URL is currently configured (production or local).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[？｜–]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('🌱 Seeding Research Archetypes to Production...\n');
  console.log(`Database: ${process.env.DATABASE_URL?.substring(0, 40)}...\n`);

  // 1. Find admin user
  let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) user = await prisma.user.findFirst();

  if (!user) {
    console.error('❌ No user found in database. Register a user first.');
    process.exit(1);
  }
  console.log(`Using user: ${user.email} (${user.id})\n`);

  // 2. Find all channels to link archetypes to
  const allChannels = await prisma.channel.findMany();
  console.log(`Found ${allChannels.length} channels to link.\n`);

  // 3. Define the 17 research archetypes with URL-safe image paths
  const researchArchetypes = [
    {
      name: 'How To Add Hyperlinks In Powerpoint [2026 Guide]',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'Best Accounting Software For Small Business？ Zoho Books Review',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'Gmail Tutorial for Beginners ｜ 2023',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'How To Cut and Trim Video In Clipchamp - Full Guide',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'How To Insert PDF File In Word - Full Guide',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'How to Add Time Tracking to Notion (For Free)',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'Layouts will make your Notion pages 10x better',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'Linux on Windows......Windows on Linux',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'Notion Formulas 2.0 – Advanced Masterclass',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: "Notion's Timeline View (and 3 Other New Features!)",
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: "Notion's New Button Feature is a Game-Changer",
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'Obsidian Tutorial For Beginners 2026 ｜ How To Use Obsidian',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: "The Ultimate Beginner's Guide to OpenClaw",
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'Turn Notion into the ultimate daily planner (full build)',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'Why LLMs get dumb (Context Windows Explained)',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'You NEED to Use n8n RIGHT NOW!! (Free, Local, Private)',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
    {
      name: 'you need to learn SQL RIGHT NOW!! (SQL Tutorial for Beginners)',
      category: 'Research',
      layoutInstructions: 'Follow the visual cues and layout from the reference image.',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const arch of researchArchetypes) {
    const slug = slugify(arch.name);
    const imageUrl = `/research/video_analysis/${slug}.jpg`;

    // Check if already exists
    const existing = await prisma.archetype.findFirst({
      where: { name: arch.name },
    });

    if (existing) {
      console.log(`⏭️  Already exists: ${arch.name}`);
      // Update imageUrl to URL-safe version
      await prisma.archetype.update({
        where: { id: existing.id },
        data: { imageUrl },
      });
      skipped++;
      continue;
    }

    console.log(`✅ Creating: ${arch.name}`);
    console.log(`   Image: ${imageUrl}`);

    const newArch = await prisma.archetype.create({
      data: {
        name: arch.name,
        category: arch.category,
        layoutInstructions: arch.layoutInstructions,
        imageUrl: imageUrl,
        isAdminOnly: true,
        userId: user.id,
      },
    });

    // Link to all channels
    for (const ch of allChannels) {
      try {
        await prisma.channelArchetype.upsert({
          where: {
            channelId_archetypeId: {
              channelId: ch.id,
              archetypeId: newArch.id,
            },
          },
          update: {},
          create: {
            channelId: ch.id,
            archetypeId: newArch.id,
          },
        });
      } catch (e) {
        // Ignore if junction table constraint fails
      }
    }

    created++;
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📊 Summary');
  console.log('═'.repeat(50));
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  Total: ${researchArchetypes.length}`);
  console.log('\n🎉 Done! Research archetypes are now in the database.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
