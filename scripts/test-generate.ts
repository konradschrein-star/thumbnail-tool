#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';
import path from 'path';

// Import TypeScript modules directly
import * as payloadEngine from '../lib/payload-engine';
import * as generationService from '../lib/generation-service';

async function main() {
  try {
    console.log('🚀 Starting thumbnail generation test...\n');

    // Verify API key is loaded
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(
        'GOOGLE_API_KEY not found in environment variables.\n' +
        'Please create a .env file with your Google API key.\n' +
        'See .env.example for the required format.'
      );
    }

    // Obsidian setup tutorial
    const testProfile: payloadEngine.HardcodedProfile = {
      name: 'Test Channel',
      systemPrompt: `Create a vibrant YouTube thumbnail in 16:9 aspect ratio. Include a handsome brown-haired man in sharp focus, pointing directly at the logo with enthusiasm.`,
      personaPath: path.resolve('assets/test/persona.jpg'),
      logoPath: path.resolve('assets/test/logo.png'),
    };

    const testArchetype: payloadEngine.HardcodedArchetype = {
      name: 'Tutorial Style',
      referencePath: path.resolve('assets/test/archetype2.jpg'),
      layoutInstructions: `Professional tutorial layout with clear subject and prominent text.`,
    };

    const testJob: payloadEngine.JobConfig = {
      videoTopic: 'How to set up Obsidian',
      thumbnailText: 'SET UP OBSIDIAN',
    };

    console.log('📦 Assembling payload...');
    console.log(`   Profile: ${testProfile.name}`);
    console.log(`   Archetype: ${testArchetype.name}`);
    console.log(`   Topic: ${testJob.videoTopic}`);
    console.log('');
    console.log('✨ Phase 1: Multi-image fusion with Nano Banana!');
    console.log('   Using gemini-3-pro-image-preview for character consistency.');
    console.log('');

    // Assemble payload
    const payload = await payloadEngine.assemblePayload(
      testProfile,
      testArchetype,
      testJob
    );

    console.log('✓ Payload assembled successfully');
    console.log(`   System prompt length: ${payload.systemPrompt.length} chars`);
    console.log(`   User prompt length: ${payload.userPrompt.length} chars`);
    console.log(`   Images encoded: ${Object.keys(payload.base64Images).length} reference images`);
    console.log('');

    console.log('🎨 Calling Nano Banana API (multi-image fusion)...');
    console.log('   This may take 10-30 seconds...');
    console.log('');

    // Call API
    const { buffer: imageBuffer, fallbackUsed } = await generationService.callNanoBanana(
      payload,
      process.env.GOOGLE_API_KEY
    );

    console.log('✓ API call successful');
    console.log(`   Received buffer size: ${imageBuffer.length} bytes${fallbackUsed ? ' (Fallback used)' : ''}`);
    console.log('');

    // Save output
    console.log('💾 Saving thumbnail...');
    await generationService.saveOutputBuffer(imageBuffer, 'output/test.png');

    console.log('');
    console.log('✅ Success! Check output/test.png');

  } catch (error: any) {
    console.error('');
    console.error('❌ Test generation failed:');
    console.error('');
    console.error('Error:', error.message);

    // Log full error details including response object for debugging
    if (error.response) {
      console.error('');
      console.error('Full error.response object:');
      console.error(JSON.stringify(error.response, null, 2));
    }

    // Log raw error for additional debugging
    console.error('');
    console.error('Raw error object:');
    console.error(error);

    process.exit(1);
  }
}

// Execute main function if script is run directly
if (require.main === module) {
  main();
}

export { main };
