const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Auth Debugger ---');
  const email = 'test@test.ai';
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`User ${email} NOT FOUND.`);
    return;
  }

  console.log('User Found:');
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Password Hash: ${user.password ? 'Exists' : 'MISSING'}`);
  
  if (user.password) {
    try {
      const isMatch = await bcrypt.compare('test', user.password);
      console.log(`- Password "test" matches? ${isMatch ? 'YES' : 'NO'}`);
    } catch (e) {
      console.error('Error comparing password:', e);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
