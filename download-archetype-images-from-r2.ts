/**
 * Download all archetype images from Cloudflare R2 and update database paths
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from './lib/prisma';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// R2 Configuration
const R2_ENDPOINT = 'https://2fbfa802850f67b30e87b3c861c59d9b.r2.cloudflarestorage.com';
const R2_ACCESS_KEY_ID = 'c998d7a060ea1d6e49fa137f5f5f75aa';
const R2_SECRET_ACCESS_KEY = '935db6fcb2507cbe691439be402bfb56d0a45ec5b1ec2ca9e894df7271eeba5d';
const R2_BUCKET_NAME = 'thumbnails';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function main() {
  console.log('📥 Downloading archetype images from R2...\n');

  // Get all archetypes with imageUrl
  const archetypes = await prisma.archetypes.findMany({
    where: {
      OR: [
        { imageUrl: { contains: '/api/assets/' } },
        { imageUrl: { equals: '' } },
      ],
    },
    select: { id: true, name: true, imageUrl: true },
  });

  console.log(`Found ${archetypes.length} archetypes to process\n`);

  // Create archetypes directory if it doesn't exist
  const archetypesDir = join(process.cwd(), 'public', 'archetypes');
  if (!existsSync(archetypesDir)) {
    mkdirSync(archetypesDir, { recursive: true });
  }

  let downloadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const archetype of archetypes) {
    if (!archetype.imageUrl || archetype.imageUrl === '') {
      console.log(`⚠️  ${archetype.name}: No imageUrl, skipping`);
      skippedCount++;
      continue;
    }

    // Skip if it's already a local path
    if (!archetype.imageUrl.includes('/api/assets/')) {
      console.log(`ℹ️  ${archetype.name}: Already local path, skipping`);
      skippedCount++;
      continue;
    }

    try {
      // Extract R2 key from imageUrl
      // Path in DB: /api/assets/users/test-user/2026-03-26/archetypes/1774487887023-thumbnail__11_.jpeg
      // R2 key: api/assets/users/test-user/2026-03-26/archetypes/1774487887023-thumbnail__11_.jpeg
      const r2Key = archetype.imageUrl.startsWith('/')
        ? archetype.imageUrl.substring(1)
        : archetype.imageUrl;

      // Extract filename
      const filename = r2Key.split('/').pop() || 'unknown.jpg';

      // Generate clean filename: archetype-{id}-{original-name}
      const extension = filename.split('.').pop();
      const cleanFilename = `archetype-${archetype.id.substring(0, 8)}-${filename}`;
      const localPath = join(archetypesDir, cleanFilename);

      console.log(`📦 Downloading: ${archetype.name}`);
      console.log(`   R2 key: ${r2Key}`);

      // Download from R2
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        throw new Error('No body in response');
      }

      // Save to local file
      const stream = response.Body as Readable;
      await pipeline(stream, createWriteStream(localPath));

      // Update database with new local path
      const newImageUrl = `/archetypes/${cleanFilename}`;
      await prisma.archetypes.update({
        where: { id: archetype.id },
        data: { imageUrl: newImageUrl },
      });

      console.log(`   ✓ Saved to: ${newImageUrl}\n`);
      downloadedCount++;
    } catch (error: any) {
      console.error(`   ✗ Failed: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✓ Downloaded: ${downloadedCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`✗ Errors: ${errorCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Download failed:', e);
  process.exit(1);
});
