const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Configuring Admin Accounts...\n');

  const admins = [
    {
      email: 'konrad.schrein@gmail.com',
      password: 'testva1234',
      name: 'Konrad Schrein'
    },
    {
      email: 'dualaryan@gmail.com',
      password: 'password',
      name: 'Admin Dual'
    }
  ];

  for (const admin of admins) {
    console.log(`Processing: ${admin.email}...`);
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    
    const user = await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        password: hashedPassword,
        role: 'ADMIN'
      },
      create: {
        email: admin.email,
        password: hashedPassword,
        name: admin.name,
        role: 'ADMIN'
      }
    });

    console.log(`✅ Upserted Admin: ${user.email} (Role: ${user.role})`);
  }

  console.log('\n🚀 Done!');
}

main()
  .catch((e) => {
    console.error('❌ Configuration failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
