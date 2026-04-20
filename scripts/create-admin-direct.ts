import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'konrad@example.com';
    const name = 'Konrad';
    const password = 'Kas98610!';

    // Check if user already exists
    const existing = await prisma.users.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('⚠️  User with this email already exists');
      console.log(`   Email: ${existing.email}`);
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log('💾 Creating admin user...');
    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log('\n🚀 You can now sign in at http://localhost:3000/auth/signin');
    console.log(`   Email: ${email}`);
    console.log(`   Password: Kas98610!\n`);
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
