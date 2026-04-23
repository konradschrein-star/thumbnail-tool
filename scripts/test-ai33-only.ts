#!/usr/bin/env node

/**
 * Direct AI33 Test (No Google Fallback)
 * Tests AI33 API with shortened prompts in isolation
 */

import 'dotenv/config';
import { buildCondensedPrompt } from '../lib/payload-engine';
import { initializeAI33Client } from '../lib/ai/ai33-client';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Simple test data
const channel = {
  name: "PowerPoint Mastery",
  primaryColor: "#B7472A",
  secondaryColor: "#FFFFFF",
  tags: "powerpoint,tutorials",
  personaDescription: "Professional educator"
};

const archetype = {
  name: "Bold Tutorial",
  basePrompt: "Modern YouTube tutorial style",
  layoutInstructions: "Bold text, vibrant colors"
};

const job = {
  videoTopic: "PowerPoint animations tutorial",
  thumbnailText: "ANIMATIONS"
};

async function main() {
  console.log('🧪 Direct AI33 Test (Shortened Prompts)\n');
  console.log('=' .repeat(60));

  // Generate condensed prompt
  const prompt = buildCondensedPrompt(channel, archetype, job);
  console.log('\n📝 Prompt to test:');
  console.log(`   "${prompt}"`);
  console.log(`   Length: ${prompt.length} characters\n`);

  // Check API key
  if (!process.env.AI33_API_KEY) {
    throw new Error('AI33_API_KEY not found in environment');
  }

  console.log('✓ AI33 API key found\n');
  console.log('🎨 Starting AI33 generation...');
  console.log('   Model: bytedance-seedream-4.5');
  console.log('   Resolution: 2K');
  console.log('   Aspect Ratio: 16:9\n');

  try {
    const client = initializeAI33Client();

    const buffer = await client.generateImage({
      prompt: prompt,
      width: 1920,
      height: 1080
    });

    console.log('\n✅ SUCCESS!');
    console.log(`   Image size: ${(buffer.length / 1024).toFixed(1)} KB`);

    // Save output
    const outputPath = join(process.cwd(), 'output', 'test-ai33-direct.png');
    writeFileSync(outputPath, buffer);
    console.log(`   Saved to: ${outputPath}`);

    console.log('\n✅ AI33 works with shortened prompts!');

  } catch (error: any) {
    console.error('\n❌ AI33 generation failed:');
    console.error(`   Error: ${error.message}`);

    // Check if it's a timeout
    if (error.message.includes('did not complete within')) {
      console.error('\n   ℹ️  This appears to be a timeout issue.');
      console.error('   Possible causes:');
      console.error('   - AI33 API is experiencing high load');
      console.error('   - Task queued behind other requests');
      console.error('   - API service degradation');
      console.error('\n   Recommendation: Try again in a few minutes');
    }

    // Check if it's a prompt issue
    if (error.message.includes('prompt') || error.message.includes('invalid')) {
      console.error('\n   ℹ️  This might be a prompt format issue.');
      console.error('   The condensed prompt might need adjustment.');
    }

    throw error;
  }
}

if (require.main === module) {
  main().catch(error => {
    process.exit(1);
  });
}

export { main };
