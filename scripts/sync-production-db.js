const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

async function main() {
  console.log('Updating Research archetypes to use /archetypes/ path...');
  const archetypes = await prisma.archetype.findMany({ where: { category: 'Research' } });
  let updated = 0;
  for (const arch of archetypes) {
    const slug = slugify(arch.name);
    const newUrl = `/archetypes/${slug}.jpg`;
    if (arch.imageUrl !== newUrl) {
      console.log(`  Updating: "${arch.name}" -> ${newUrl}`);
      await prisma.archetype.update({ where: { id: arch.id }, data: { imageUrl: newUrl } });
      updated++;
    }
  }
  console.log(`Successfully updated ${updated} archetypes.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
