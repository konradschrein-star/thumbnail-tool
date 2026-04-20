import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

/**
 * Initial admin user setup script
 * Creates the first user account with admin privileges
 */
async function setupAdmin() {
  try {
    // Check if any users exist
    const userCount = await prisma.users.count();

    if (userCount > 0) {
      console.log('⚠️  Users already exist in the database.');
      console.log(`   Current user count: ${userCount}`);
      console.log('   Use the registration API endpoint to create additional users.');
      process.exit(0);
    }

    console.log('🔧 Initial Admin Setup\n');
    console.log('Creating the first admin user for your Thumbnail Creator application.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (query: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(query, resolve);
      });
    };

    // Collect admin details
    const email = await question('Admin email: ');
    const name = await question('Admin name (optional): ');
    let password = await question('Admin password (min 8 characters): ');

    // Validate email
    if (!email || !email.includes('@')) {
      console.error('\n❌ Invalid email address');
      rl.close();
      process.exit(1);
    }

    // Validate password
    if (!password || password.length < 8) {
      console.error('\n❌ Password must be at least 8 characters');
      rl.close();
      process.exit(1);
    }

    rl.close();

    // Hash password
    console.log('\n🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log('💾 Creating admin user...');
    const user = await prisma.users.create({
      data: {
        email: email.trim(),
        password: hashedPassword,
        name: name.trim() || null,
      },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || '(not set)'}`);
    console.log('\n🚀 You can now sign in at http://localhost:3000/auth/signin\n');
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();
