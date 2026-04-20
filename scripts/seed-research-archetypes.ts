import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Research Archetypes...\n');

  // Find or create a default channel
  let channel = await prisma.channels.findFirst();
  
  if (!channel) {
    console.log('No channel found, creating default "Titan Research" channel...');
    channel = await prisma.channels.create({
      data: {
        name: 'Titan Research',
        personaDescription: 'A professional and clean research persona.',
      },
    });
  }

  const researchArchetypes = [
    {
      name: 'Software Spotlight',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426',
      layoutInstructions: 'Focus on UI elements and software interfaces. High clarity on dashboards and toolbars. Soft contrast for professional look.',
      category: 'Research',
      isAdminOnly: true,
    },
    {
      name: 'Persona Authority',
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2574',
      layoutInstructions: 'Prominent speaker/persona with strong facial expressions. Persona should occupy 30-40% of the frame. Dramatic lighting.',
      category: 'Research',
      isAdminOnly: true,
    },
    {
      name: 'High-Contrast Split',
      imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2670',
      layoutInstructions: 'Vertical or diagonal split between two contrasting concepts. Use complementary colors for high visual impact.',
      category: 'Research',
      isAdminOnly: true,
    },
    {
      name: 'Narrative Minimalist',
      imageUrl: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=2667',
      layoutInstructions: 'Clean layout with ample white space. Minimal text, single high-impact focal point. Calm and premium aesthetic.',
      category: 'Research',
      isAdminOnly: true,
    },
  ];

  for (const arch of researchArchetypes) {
    const existing = await prisma.archetypes.findFirst({
      where: { name: arch.name }
    });

    if (existing) {
      console.log(`- Archetype "${arch.name}" already exists, updating...`);
      await prisma.archetypes.update({
        where: { id: existing.id },
        data: arch as any,
      });
    } else {
      console.log(`- Creating archetype: ${arch.name}`);
      await prisma.archetypes.create({
        data: {
          ...arch,
          channelId: channel.id,
        } as any,
      });
    }
  }

  console.log('\n✅ Research Archetypes seeded successfully!');
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
