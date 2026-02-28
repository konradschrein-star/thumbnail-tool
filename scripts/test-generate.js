#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv/config');

// Import TypeScript modules using ts-node or run after compilation
const path = require('path');

// For Phase 1, we'll use a simpler approach with dynamic import
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

    // Import compiled CommonJS modules
    const payloadEngine = require('../lib/payload-engine.js');
    const generationService = require('../lib/generation-service.js');

    // Debug: Check what's exported
    console.log('DEBUG: generationService exports:', Object.keys(generationService));
    console.log('DEBUG: callNanoBanana type:', typeof generationService.callNanoBanana);
    console.log('DEBUG: callNanoBanana value:', generationService.callNanoBanana);

    // Hardcoded test data
    const testProfile = {
      name: 'Test Channel',
      systemPrompt: `You are an expert thumbnail designer for a professional YouTube channel.
Your designs should be bold, eye-catching, and optimized for mobile viewing.
Always ensure text is large and legible, with high contrast against backgrounds.
Use the provided persona.jpeg image and logo.png to maintain brand consistency.`,
      personaPath: path.resolve('assets/test/persona.jpeg'),
      logoPath: path.resolve('assets/test/logo.png'),
    };

    const testArchetype = {
      name: 'Bold Text Overlay',
      referencePath: path.resolve('assets/test/archetype.jpeg'),
      layoutInstructions: `Layout Style: Bold text overlay with dynamic composition
- Main text: Large, bold, centered or slightly offset
- Persona: Positioned prominently (left, right, or center depending on composition)
- Logo: Top-right or bottom-right corner, subtle but visible
- Color scheme: High contrast, vibrant colors
- Background: May include subtle patterns or gradients that don't compete with text`,
    };

    const testJob = {
      videoTopic: '5 Proven Strategies to Boost Your Productivity',
      thumbnailText: 'BOOST YOUR PRODUCTIVITY',
    };

    console.log('📦 Assembling payload...');
    console.log(`   Profile: ${testProfile.name}`);
    console.log(`   Archetype: ${testArchetype.name}`);
    console.log(`   Topic: ${testJob.videoTopic}`);
    console.log('');
    console.log('⚠️  Phase 1 Note: Images are encoded but NOT sent to API yet.');
    console.log('   Imagen 3 uses text-only prompts. Multi-image composition = Phase 2.');
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
    console.log(`   Images encoded: ${Object.keys(payload.base64Images).length} (not used in Phase 1)`);
    console.log('');

    console.log('🎨 Calling Imagen 3 API (text-to-image)...');
    console.log('   This may take 10-30 seconds...');
    console.log('');

    // Call API
    const imageBuffer = await generationService.callNanoBanana(
      payload,
      process.env.GOOGLE_API_KEY
    );

    console.log('✓ API call successful');
    console.log(`   Received buffer size: ${imageBuffer.length} bytes`);
    console.log('');

    // Save output
    console.log('💾 Saving thumbnail...');
    await generationService.saveOutputBuffer(imageBuffer, 'output/test.png');

    console.log('');
    console.log('✅ Success! Check output/test.png');

  } catch (error) {
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

module.exports = { main };
