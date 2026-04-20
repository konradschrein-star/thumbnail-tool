import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The consistent persona from Phase 1 testing
const PROVEN_PERSONA = `The host is a 28-year-old charismatic male with medium-length, slightly wavy brown hair styled casually with natural volume. He has warm hazel eyes, a strong defined jawline, and a friendly smile showing genuine enthusiasm. His face is oval-shaped with high cheekbones and a straight nose. He has a fit athletic build, stands confidently, and wears a simple black crew-neck t-shirt. His skin tone is lightly tanned (Mediterranean complexion). He has subtle stubble (5 o'clock shadow) giving him a mature, approachable look. His eyebrows are well-defined and expressive. This exact person appears in sharp focus with professional studio lighting, looking directly at the camera with an engaging, confident expression.`;

const TEST_PERSONA = `A friendly 25-year-old female tech enthusiast with shoulder-length straight black hair, bright brown eyes, and an engaging smile. She has a round face with soft features, wearing casual tech startup attire. Her expression is warm and inviting, perfect for beginner-friendly tech tutorials.`;

async function main() {
  console.log('🌱 Seeding database...\n');

  // Find or create admin user
  let adminUser = await prisma.users.findUnique({
    where: { email: 'admin@test.ai' }
  });

  if (!adminUser) {
    adminUser = await prisma.users.create({
      data: {
        email: 'admin@test.ai',
        name: 'Admin User',
        password: '$2a$10$hashed_password_placeholder', // This should be hashed in production
        role: 'ADMIN'
      }
    });
    console.log(`✓ Created admin user: ${adminUser.email}`);
  } else {
    console.log(`✓ Found existing admin user: ${adminUser.email}`);
  }

  // Find or create test user
  let testUser = await prisma.users.findUnique({
    where: { email: 'test@test.ai' }
  });

  if (!testUser) {
    testUser = await prisma.users.create({
      data: {
        email: 'test@test.ai',
        name: 'Test User',
        password: '$2a$10$hashed_password_placeholder',
        role: 'USER'
      }
    });
    console.log(`✓ Created test user: ${testUser.email}`);
  } else {
    console.log(`✓ Found existing test user: ${testUser.email}`);
  }

  // Create admin's channel "Test" with admin-only archetypes
  const adminChannel = await prisma.channels.create({
    data: {
      name: 'Test',
      personaDescription: PROVEN_PERSONA,
      userId: adminUser.id,
    },
  });

  console.log(`✓ Created admin channel: ${adminChannel.name} (${adminChannel.id})`);

  // Create admin-only archetypes
  const adminArchetypes = [
    {
      name: 'Admin Striking Warning Style',
      imageUrl: '/archetypes/archetype2.jpg',
      layoutInstructions: 'Bold warning colors with strong visual impact for attention-grabbing content',
      isAdminOnly: true,
    },
    {
      name: 'Admin Modern Productivity Style',
      imageUrl: '/archetypes/archetype3.jpeg',
      layoutInstructions: 'Clean, modern aesthetic focused on productivity and workspace content',
      isAdminOnly: true,
    },
    {
      name: 'Admin Dramatic Bold Style',
      imageUrl: '/archetypes/archetype4.jpeg',
      layoutInstructions: 'Edgy, rebellious design with strong contrast for opinion/controversial content',
      isAdminOnly: true,
    },
    {
      name: 'Admin Educational Friendly Style',
      imageUrl: '/archetypes/archetype5.jpeg',
      layoutInstructions: 'Approachable, beginner-friendly design for step-by-step tutorials',
      isAdminOnly: true,
    },
    {
      name: 'Admin Energetic Tech Style',
      imageUrl: '/archetypes/archetype6.jpeg',
      layoutInstructions: 'Dynamic, tech-focused layout with movement and energy for quick tips',
      isAdminOnly: true,
    },
    {
      name: 'Admin Comparison Battle Style',
      imageUrl: '/archetypes/archetype7.jpeg',
      layoutInstructions: 'Split-screen comparison design with dramatic versus styling',
      isAdminOnly: true,
    },
  ];

  for (const archetype of adminArchetypes) {
    const created = await prisma.archetypes.create({
      data: {
        ...archetype,
        userId: adminUser.id,
        channel_archetypes: {
          create: {
            channelId: adminChannel.id,
          },
        },
      },
    });
    console.log(`✓ Created admin archetype: ${created.name}`);
  }

  // Create test user's channel "test 2"
  const testChannel = await prisma.channels.create({
    data: {
      name: 'test 2',
      personaDescription: TEST_PERSONA,
      userId: testUser.id,
    },
  });

  console.log(`✓ Created test channel: ${testChannel.name} (${testChannel.id})`);

  // Create test user archetypes
  const testArchetypes = [
    {
      name: 'Normal Tutorial Style',
      imageUrl: '/archetypes/archetype5.jpeg',
      layoutInstructions: 'Simple, friendly tutorial layout for beginners',
      isAdminOnly: false,
    },
    {
      name: 'Casual Tech Style',
      imageUrl: '/archetypes/archetype6.jpeg',
      layoutInstructions: 'Casual, approachable tech content design',
      isAdminOnly: false,
    },
  ];

  for (const archetype of testArchetypes) {
    const created = await prisma.archetypes.create({
      data: {
        ...archetype,
        userId: testUser.id,
        channel_archetypes: {
          create: {
            channelId: testChannel.id,
          },
        },
      },
    });
    console.log(`✓ Created test archetype: ${created.name}`);
  }

  console.log(`\n✅ Seeded 2 users, 2 channels, and 8 archetypes`);
  console.log(`   - Admin channel "Test" with 6 admin-only archetypes`);
  console.log(`   - Test user channel "test 2" with 2 regular archetypes`);
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
