/**
 * Fix admin password - Generate proper bcrypt hash and update via Prisma
 */
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

async function main() {
  const email = 'konrad.schrein@gmail.com';
  const plainPassword = 'testva1234';

  console.log('🔐 Fixing admin password...\n');

  // 1. Find user
  const user = await prisma.users.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, password: true },
  });

  if (!user) {
    console.error('❌ User not found:', email);
    process.exit(1);
  }

  console.log('✓ User found:', user.email);
  console.log('  Role:', user.role);
  console.log('  Current hash:', user.password?.substring(0, 20) + '...\n');

  // 2. Generate new hash using same method as app (bcryptjs with 12 rounds)
  console.log('Generating new bcrypt hash (12 rounds)...');
  const newHash = await bcrypt.hash(plainPassword, 12);
  console.log('✓ New hash generated:', newHash.substring(0, 20) + '...');
  console.log('  Full hash:', newHash, '\n');

  // 3. Verify hash works BEFORE updating database
  console.log('Verifying hash works with bcrypt.compare...');
  const isValid = await bcrypt.compare(plainPassword, newHash);
  console.log(isValid ? '✓ Hash validates correctly!' : '❌ Hash validation FAILED!');

  if (!isValid) {
    console.error('\n❌ Generated hash does not validate. Aborting update.');
    process.exit(1);
  }

  // 4. Update database using raw SQL (Prisma schema has extra field not in DB)
  console.log('\nUpdating database via raw SQL...');
  await prisma.$executeRaw`
    UPDATE users
    SET password = ${newHash}, "updatedAt" = NOW()
    WHERE id = ${user.id}
  `;

  console.log('✓ Password updated successfully\n');

  // 5. Verify database update
  console.log('Verifying database update...');
  const verified = await prisma.users.findUnique({
    where: { email },
    select: { password: true },
  });

  if (verified?.password === newHash) {
    console.log('✓ Database verification PASSED');
  } else {
    console.error('❌ Database verification FAILED - hash mismatch');
    console.log('Expected:', newHash);
    console.log('Got:', verified?.password);
  }

  // 6. Final test - compare with retrieved hash
  console.log('\nFinal test - bcrypt.compare with database hash...');
  if (verified?.password) {
    const finalTest = await bcrypt.compare(plainPassword, verified.password);
    console.log(finalTest ? '✓ FINAL TEST PASSED!' : '❌ FINAL TEST FAILED!');
  }

  await prisma.$disconnect();

  console.log('\n✅ Done! Try logging in with:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${plainPassword}`);
}

main().catch((e) => {
  console.error('❌ Fix failed:', e);
  process.exit(1);
});
