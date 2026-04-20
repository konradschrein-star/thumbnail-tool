/**
 * Sync entire /api/assets/ directory from Cloudflare R2
 */
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
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
  console.log('📥 Syncing archetype images from R2...\n');

  const publicDir = join(process.cwd(), 'public');
  let downloadedCount = 0;
  let continuationToken: string | undefined;

  do {
    // List all objects with prefix 'users/test-user/' (where archetypes are stored in R2)
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'users/test-user/',
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('No objects found in R2 bucket with prefix users/test-user/');
      break;
    }

    console.log(`Found ${listResponse.Contents.length} objects in this batch\n`);

    for (const object of listResponse.Contents) {
      if (!object.Key) continue;

      try {
        // R2 key: users/test-user/2026-03-16/archetypes/file.png
        // Database path: /api/assets/users/test-user/2026-03-16/archetypes/file.png
        // Local path: public/api/assets/users/test-user/2026-03-16/archetypes/file.png
        const localPath = join(publicDir, 'api', 'assets', object.Key);
        const localDir = dirname(localPath);

        // Create directory if it doesn't exist
        if (!existsSync(localDir)) {
          mkdirSync(localDir, { recursive: true });
        }

        // Skip if file already exists
        if (existsSync(localPath)) {
          console.log(`⏭️  ${object.Key} (already exists)`);
          continue;
        }

        console.log(`📦 Downloading: ${object.Key}`);

        // Download from R2
        const getCommand = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: object.Key,
        });

        const response = await s3Client.send(getCommand);

        if (!response.Body) {
          throw new Error('No body in response');
        }

        // Save to local file
        const stream = response.Body as Readable;
        await pipeline(stream, createWriteStream(localPath));

        console.log(`   ✓ Saved to: ${localPath}\n`);
        downloadedCount++;
      } catch (error: any) {
        console.error(`   ✗ Failed to download ${object.Key}: ${error.message}\n`);
      }
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  console.log('\n✅ Sync complete!');
  console.log(`Downloaded ${downloadedCount} files`);
  console.log('\nThe /api/assets/ paths in the database will now work automatically.');
}

main().catch((e) => {
  console.error('Sync failed:', e);
  process.exit(1);
});
