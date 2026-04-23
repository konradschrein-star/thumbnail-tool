import { prisma } from '../lib/prisma';

async function test() {
  try {
    console.log('Testing DB...');
    const count = await prisma.channels.count();
    console.log('SUCCESS - Channels:', count);
  } catch (e) {
    console.error('FAILED:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
