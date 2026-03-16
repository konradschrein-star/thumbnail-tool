const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Promoting test@test.ai to ADMIN ---');
  const result = await prisma.user.updateMany({
    where: { email: 'test@test.ai' },
    data: { role: 'ADMIN' }
  });
  console.log('Updated users:', result.count);
  
  const user = await prisma.user.findUnique({ where: { email: 'test@titan.ai' } });
  console.log('Current state:', user ? `${user.email} | ${user.role}` : 'User not found');
}

main().catch(console.error).finally(() => prisma.$disconnect());
