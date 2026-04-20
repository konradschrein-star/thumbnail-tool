/**
 * Upload archetype images to Google File API and update database URLs
 *
 * This script:
 * 1. Reads archetype images from public/archetypes/
 * 2. Uploads them to Google's File API
 * 3. Updates database with File API URLs
 */

import { GoogleGenAI } from '@google/genai';
import { prisma } from '../lib/prisma';
import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ARCHETYPES_DIR = join(process.cwd(), 'public', 'archetypes');

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY environment variable is required');
  process.exit(1);
}

async function uploadFileToGoogle(filePath: string, displayName: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY! });

  console.log(`   Uploading ${displayName}...`);

  const fileBuffer = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase();

  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.webp') mimeType = 'image/webp';

  try {
    const uploadResponse = await ai.files.upload({
      file: {
        data: fileBuffer,
        mimeType: mimeType
      },
      config: {
        displayName: displayName
      }
    });

    console.log(`   ✓ Uploaded: ${uploadResponse.uri}`);
    return uploadResponse.uri;
  } catch (error: any) {
    console.error(`   ✗ Failed to upload ${displayName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('\n📤 Uploading archetype images to Google File API...\n');

  // Get all archetypes from database
  const archetypes = await prisma.archetypes.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true
    }
  });

  console.log(`Found ${archetypes.length} archetypes in database`);

  for (const archetype of archetypes) {
    console.log(`\n🔄 Processing: ${archetype.name}`);
    console.log(`   Current URL: ${archetype.imageUrl}`);

    // Extract filename from current URL
    const filename = archetype.imageUrl.split('/').pop();
    if (!filename) {
      console.warn(`   ⚠️  Skipping - invalid URL format`);
      continue;
    }

    // Check if already using Google File API
    if (archetype.imageUrl.startsWith('https://generativelanguage.googleapis.com/')) {
      console.log(`   ✓ Already using Google File API - skipping`);
      continue;
    }

    const filePath = join(ARCHETYPES_DIR, filename);

    try {
      const fileApiUrl = await uploadFileToGoogle(filePath, `archetype-${archetype.name}`);

      // Update database
      await prisma.archetypes.update({
        where: { id: archetype.id },
        data: { imageUrl: fileApiUrl }
      });

      console.log(`   ✓ Database updated with File API URL`);
    } catch (error: any) {
      console.error(`   ✗ Failed to process ${archetype.name}:`, error.message);
    }
  }

  console.log('\n✅ Upload complete!\n');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
