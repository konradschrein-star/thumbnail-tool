import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.channels.findMany();
  console.log('CHANNELS_START');
  console.log(JSON.stringify(channels, null, 2));
  console.log('CHANNELS_END');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
