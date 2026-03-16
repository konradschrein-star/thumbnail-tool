const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true }
  });

  const ownership = await prisma.archetype.groupBy({
    by: ['userId'],
    _count: { id: true }
  });

  console.log(JSON.stringify({ users, ownership }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
