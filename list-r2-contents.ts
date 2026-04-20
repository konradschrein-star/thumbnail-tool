/**
 * List all contents of R2 bucket to understand the structure
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
  console.log('📋 Listing R2 bucket contents...\n');

  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    MaxKeys: 50, // Get first 50 objects
  });

  const response = await s3Client.send(command);

  if (!response.Contents || response.Contents.length === 0) {
    console.log('Bucket is empty or no access');
    return;
  }

  console.log(`Found ${response.Contents.length} objects:\n`);

  response.Contents.forEach((object, index) => {
    console.log(`${index + 1}. ${object.Key} (${object.Size} bytes)`);
  });

  if (response.KeyCount && response.KeyCount > 50) {
    console.log(`\n... and ${response.KeyCount - 50} more objects`);
  }
}

main().catch((e) => {
  console.error('List failed:', e);
  process.exit(1);
});
