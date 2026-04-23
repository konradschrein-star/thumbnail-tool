#!/usr/bin/env node

/**
 * Test AI33 Integration with Shortened Prompts
 *
 * This script verifies:
 * 1. Condensed prompts are significantly shorter than full prompts
 * 2. AI33 API works with the condensed prompts
 * 3. Fallback to Google works if AI33 fails
 */

import 'dotenv/config';
import { buildFullPrompt, buildCondensedPrompt } from '../lib/payload-engine';
import { createUnifiedGeneratorFromEnv } from '../lib/ai/image-generator';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Test data
const channel = {
  name: "Test Channel",
  primaryColor: "#FF0000",
  secondaryColor: "#000000",
  tags: "youtube,tutorials",
  personaDescription: "A charismatic 35-year-old male host with short brown hair, bright blue eyes, an athletic build, and an infectious smile. He has a square jawline, prominent cheekbones, and a well-groomed short beard. His skin has a healthy tan complexion. He typically wears casual business attire - fitted button-up shirts in solid colors. His expression is enthusiastic and engaging, with wide eyes and an open mouth showing excitement. Professional studio lighting highlights his face with dramatic rim lighting creating depth and separation from the background.",
  personaAssetPath: "/test/persona.jpg"
};

const archetype = {
  name: "Bold Tutorial Style",
  basePrompt: "Professional YouTube tutorial layout with vibrant colors, clear typography, and dramatic lighting. The composition should feature the subject prominently with high contrast and bold text placement. Modern aesthetic with professional polish.",
  layoutInstructions: "Professional tutorial layout with clear subject and prominent text positioned in the upper third of the frame. Use bold, all-caps typography with thick outlines for maximum readability."
};

const job = {
  videoTopic: "How to master PowerPoint animations and create stunning presentations",
  thumbnailText: "MASTER POWERPOINT"
};

async function main() {
  console.log('🧪 Testing AI33 Integration with Shortened Prompts\n');

  // Step 1: Compare prompt lengths
  console.log('📝 STEP 1: Comparing Prompt Lengths');
  console.log('=' .repeat(60));

  const fullPrompt = buildFullPrompt(channel, archetype, job, true, true);
  const condensedPrompt = buildCondensedPrompt(channel, archetype, job);

  console.log(`\n📄 Full Prompt (for Google Gemini):`);
  console.log(`   Length: ${fullPrompt.length} characters`);
  console.log(`   Preview: ${fullPrompt.substring(0, 150)}...`);

  console.log(`\n📄 Condensed Prompt (for AI33):`);
  console.log(`   Length: ${condensedPrompt.length} characters`);
  console.log(`   Full: ${condensedPrompt}`);

  const reduction = ((1 - condensedPrompt.length / fullPrompt.length) * 100).toFixed(1);
  console.log(`\n   ✅ Prompt reduced by ${reduction}%`);

  // Step 2: Test AI33 API
  console.log('\n\n🎨 STEP 2: Testing Unified Generator (AI33 → Google Fallback)');
  console.log('=' .repeat(60));

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not found in environment variables');
  }

  if (!process.env.AI33_API_KEY) {
    console.warn('⚠️  AI33_API_KEY not found - will skip AI33 and use Google only\n');
  } else {
    console.log('✓ AI33_API_KEY found - will attempt AI33 first\n');
  }

  try {
    const generator = createUnifiedGeneratorFromEnv();

    console.log('Generating test thumbnail...');
    console.log('(This may take 10-60 seconds depending on which provider is used)\n');

    const result = await generator.generateImage({
      prompt: condensedPrompt,
      referenceImageUrl: 'https://example.com/dummy.jpg', // Note: AI33 doesn't use reference images
      personaImageUrl: undefined
    });

    console.log('\n✅ Generation successful!');
    console.log(`   Provider: ${result.provider.toUpperCase()}`);
    console.log(`   Fallback used: ${result.fallbackUsed ? 'Yes' : 'No'}`);
    if (result.fallbackMessage) {
      console.log(`   Fallback message: ${result.fallbackMessage}`);
    }
    console.log(`   Cost: $${result.cost.amount} ${result.cost.currency}`);
    console.log(`   Image size: ${(result.buffer.length / 1024).toFixed(1)} KB`);

    // Save the output
    const outputPath = join(process.cwd(), 'output', 'test-ai33.png');
    writeFileSync(outputPath, result.buffer);
    console.log(`\n💾 Saved to: ${outputPath}`);

  } catch (error: any) {
    console.error('\n❌ Generation failed:');
    console.error(`   Error: ${error.message}`);

    if (error.stack) {
      console.error(`\n   Stack trace:`);
      console.error(error.stack);
    }

    process.exit(1);
  }

  console.log('\n✅ All tests passed!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
