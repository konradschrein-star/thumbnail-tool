/**
 * List archetype images in R2
 */
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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
  console.log('📋 Looking for archetype images...\n');

  // Try different possible prefixes
  const prefixes = [
    'users/test-user',
    'api/assets/users/test-user',
    'assets/users/test-user',
    'archetypes',
  ];

  for (const prefix of prefixes) {
    console.log(`Checking prefix: ${prefix}`);

    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 10,
    });

    try {
      const response = await s3Client.send(command);

      if (response.Contents && response.Contents.length > 0) {
        console.log(`✓ Found ${response.KeyCount} objects:`);
        response.Contents.slice(0, 5).forEach((obj) => {
          console.log(`  - ${obj.Key}`);
        });
        if (response.KeyCount && response.KeyCount > 5) {
          console.log(`  ... and ${response.KeyCount - 5} more`);
        }
        console.log();
      } else {
        console.log(`  (empty)\n`);
      }
    } catch (error: any) {
      console.log(`  Error: ${error.message}\n`);
    }
  }
}

main().catch((e) => {
  console.error('List failed:', e);
  process.exit(1);
});
