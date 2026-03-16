const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'conrad.schwein@gmail.com' }
  });
  console.log('Search result for conrad.schwein@gmail.com:');
  console.log(JSON.stringify(user, null, 2));

  if (!user) {
    console.log('User not found. Checking all users in the DB...');
    const allUsers = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    console.log(JSON.stringify(allUsers, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
