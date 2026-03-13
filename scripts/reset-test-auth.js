const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'test@test.ai';
  const newPassword = 'test';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  console.log(`Successfully reset password for ${email}.`);
  console.log(`New Hash: ${updatedUser.password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
