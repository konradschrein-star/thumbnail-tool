import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The consistent persona from Phase 1 testing
const PROVEN_PERSONA = `The host is a 28-year-old charismatic male with medium-length, slightly wavy brown hair styled casually with natural volume. He has warm hazel eyes, a strong defined jawline, and a friendly smile showing genuine enthusiasm. His face is oval-shaped with high cheekbones and a straight nose. He has a fit athletic build, stands confidently, and wears a simple black crew-neck t-shirt. His skin tone is lightly tanned (Mediterranean complexion). He has subtle stubble (5 o'clock shadow) giving him a mature, approachable look. His eyebrows are well-defined and expressive. This exact person appears in sharp focus with professional studio lighting, looking directly at the camera with an engaging, confident expression.`;

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create test channel with proven persona
  const channel = await prisma.channel.create({
    data: {
      name: 'Tech Tutorials Pro',
      personaDescription: PROVEN_PERSONA,
    },
  });

  console.log(`✓ Created channel: ${channel.name} (${channel.id})`);

  // Create 7 archetypes from Phase 1 testing
  const archetypes = [
    {
      name: 'Striking Warning Style',
      imageUrl: '/archetypes/archetype2.jpg',
      layoutInstructions: 'Bold warning colors with strong visual impact for attention-grabbing content',
    },
    {
      name: 'Modern Productivity Style',
      imageUrl: '/archetypes/archetype3.jpeg',
      layoutInstructions: 'Clean, modern aesthetic focused on productivity and workspace content',
    },
    {
      name: 'Dramatic Bold Style',
      imageUrl: '/archetypes/archetype4.jpeg',
      layoutInstructions: 'Edgy, rebellious design with strong contrast for opinion/controversial content',
    },
    {
      name: 'Educational Friendly Style',
      imageUrl: '/archetypes/archetype5.jpeg',
      layoutInstructions: 'Approachable, beginner-friendly design for step-by-step tutorials',
    },
    {
      name: 'Energetic Tech Style',
      imageUrl: '/archetypes/archetype6.jpeg',
      layoutInstructions: 'Dynamic, tech-focused layout with movement and energy for quick tips',
    },
    {
      name: 'Comparison Battle Style',
      imageUrl: '/archetypes/archetype7.jpeg',
      layoutInstructions: 'Split-screen comparison design with dramatic versus styling',
    },
  ];

  for (const archetype of archetypes) {
    const created = await prisma.archetype.create({
      data: {
        ...archetype,
        channelId: channel.id,
      },
    });
    console.log(`✓ Created archetype: ${created.name}`);
  }

  console.log(`\n✅ Seeded 1 channel with 6 archetypes`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
