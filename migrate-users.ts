/**
 * Migrate old user accounts to new database
 */
import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';

const OLD_USERS = [
  {
    email: 'konrad.schrein@gmail.com',
    password: 'testva1234',
    name: 'Konrad Schrein',
    role: 'ADMIN',
  },
  {
    email: 'dualaryan@gmail.com',
    password: 'testva1234',
    name: 'Dual Aryan',
    role: 'USER',
  },
  {
    email: 'shane@nowagogo.com',
    password: 'shane',
    name: 'Shane',
    role: 'USER',
  },
  {
    email: 'peter@ytavictory.com',
    password: 'Perteriscool123!',
    name: 'Peter',
    role: 'USER',
  },
];

async function main() {
  console.log('Migrating old user accounts...\n');

  for (const userData of OLD_USERS) {
    try {
      // Check if user already exists
      const existingUser = await prisma.users.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.email} - skipping`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.users.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role as 'ADMIN' | 'USER',
        },
      });

      console.log(`✓ Created ${userData.role}: ${user.email} (${user.name})`);
    } catch (error) {
      console.error(`✗ Failed to create ${userData.email}:`, error);
    }
  }

  console.log('\n✅ User migration complete!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
