const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  const ownership = await prisma.archetype.groupBy({ by: ['userId'], _count: { id: true } });

  console.log('--- USERS ---');
  users.forEach(u => console.log(`${u.id} | ${u.role} | ${u.email}`));
  console.log('\n--- OWNERSHIP ---');
  ownership.forEach(o => console.log(`${o.userId} | ${o._count.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
