const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const researchDir = 'research/video_analysis';

async function main() {
  console.log('🌱 Seeding 17 Granular Research Archetypes (Many-to-Many)...\n');

  // 1. Find a valid user to assign ownership
  let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) user = await prisma.user.findFirst();
  
  if (!user) {
    console.error('❌ Error: No user found in database. Please register a user first.');
    process.exit(1);
  }
  console.log(`Assigning archetypes to user: ${user.email} (${user.id})`);

  // 2. Find or create a default channel
  let channel = await prisma.channel.findFirst();
  if (!channel) {
    console.log('No channel found, creating default "Titan Research" channel...');
    channel = await prisma.channel.create({
      data: {
        name: 'Titan Research',
        personaDescription: 'A professional and clean research persona.',
        userId: user.id
      },
    });
  }

  const allChannels = await prisma.channel.findMany();
  console.log(`Associating with ${allChannels.length} channels.`);

  for (const folder of folders) {
    // ... existing analysis logic ...
    const mdPath = path.join(researchDir, folder, 'thumbnail_analysis.md');
    let category = 'Research';
    let instructions = '';

    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf8');
      
      const archMatch = content.match(/## Archetype: (.*)/);
      if (archMatch) category = archMatch[1].trim();

      const prosMatch = content.match(/### Pros for UI Generation\n([\s\S]*?)\n###/);
      if (prosMatch) {
        instructions = prosMatch[1]
          .replace(/- /g, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .trim()
          .split('\n')
          .join(' ');
      }
    }

    const imageUrl = `/research/video_analysis/${folder}.jpg`;

    const existing = await prisma.archetype.findFirst({
      where: { name: folder }
    });

    let archetype;
    if (existing) {
      console.log(`- Updating archetype: ${folder}`);
      archetype = await prisma.archetype.update({
        where: { id: existing.id },
        data: {
          name: folder,
          category: category,
          layoutInstructions: instructions || 'Follow the visual cues and layout from the reference image.',
          imageUrl: imageUrl,
          isAdminOnly: true,
          userId: user.id,
        },
      });
    } else {
      console.log(`- Creating archetype: ${folder}`);
      archetype = await prisma.archetype.create({
        data: {
          name: folder,
          category: category,
          layoutInstructions: instructions || 'Follow the visual cues and layout from the reference image.',
          imageUrl: imageUrl,
          isAdminOnly: true,
          userId: user.id
        },
      });
    }

    // Link to ALL channels
    for (const c of allChannels) {
      await prisma.channelArchetype.upsert({
        where: {
          channelId_archetypeId: {
            channelId: c.id,
            archetypeId: archetype.id
          }
        },
        update: {},
        create: {
          channelId: c.id,
          archetypeId: archetype.id
        }
      });
    }
  }

  // Cleanup old generic archetypes (specific ones only)
  const genericNames = ['Software Spotlight', 'Persona Authority', 'High-Contrast Split', 'Narrative Minimalist'];
  for (const name of genericNames) {
    const genericArch = await prisma.archetype.findFirst({ where: { name } });
    if (genericArch) {
      console.log(`- Removing generic template: ${name}`);
      // Junction table records will be deleted by cascade or manually if not defined
      await prisma.channelArchetype.deleteMany({ where: { archetypeId: genericArch.id } });
      await prisma.archetype.delete({ where: { id: genericArch.id } });
    }
  }

  console.log('\n✅ 17 Granular Research Archetypes seeded and linked to all channels!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
