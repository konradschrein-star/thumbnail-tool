/**
 * Test script to determine the actual prompt length limit for Nano Banana 2
 *
 * This script makes API calls with progressively longer prompts to find where it fails.
 */

import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.AI33_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ AI33_API_KEY or GOOGLE_API_KEY not found in .env file');
  process.exit(1);
}

console.log('🔑 Using API key:', GOOGLE_API_KEY.slice(0, 10) + '...');

async function testPromptLength(promptLength: number): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY! });

    // Generate a prompt of specific length
    const basePrompt = "Create a YouTube thumbnail showing ";
    // Generate enough filler to reach any length
    const fillerUnit = "a very detailed and interesting scene with lots of specific details about the content ";
    const repeats = Math.ceil((promptLength - basePrompt.length) / fillerUnit.length) + 10;
    const filler = fillerUnit.repeat(repeats);
    const prompt = (basePrompt + filler).slice(0, promptLength);

    console.log(`\n📝 Testing prompt length: ${prompt.length} characters`);
    console.log(`   First 100 chars: "${prompt.slice(0, 100)}..."`);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview', // Nano Banana 2
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      config: {
        responseModalities: ["IMAGE"],
        imageGenerationConfig: {
          aspectRatio: "16:9",
          resolution: "1K"
        }
      } as any
    });

    if (response.candidates && response.candidates.length > 0) {
      const usage = response.usageMetadata;
      console.log(`   ✅ SUCCESS - Tokens used: ${usage?.totalTokenCount || 'unknown'}`);
      console.log(`   Input tokens: ${usage?.promptTokenCount || 'unknown'}`);
      return true;
    } else {
      console.log(`   ❌ FAILED - No candidates returned`);
      return false;
    }
  } catch (error: any) {
    console.log(`   ❌ FAILED - Error: ${error.message}`);

    // Check if it's a prompt length error
    if (error.message.includes('prompt') && (error.message.includes('too long') || error.message.includes('limit'))) {
      console.log(`   🎯 This appears to be a prompt length limit error!`);
    }

    return false;
  }
}

async function findPromptLimit() {
  console.log('🔬 Testing Nano Banana 2 Prompt Length Limits\n');
  console.log('='.repeat(60));

  // Test various prompt lengths
  const testLengths = [
    500,      // Current safe zone
    1000,     // Double current
    2000,     // Current theoretical limit
    4000,     // 2x current limit
    8000,     // 4x
    16000,    // 8x
    32000,    // 16x
    64000,    // 32x (approaching 65K tokens at ~4 chars/token)
    128000,   // Near 131K token limit
    256000,   // Double token limit
  ];

  let lastSuccessfulLength = 0;
  let firstFailureLength = 0;

  for (const length of testLengths) {
    const success = await testPromptLength(length);

    if (success) {
      lastSuccessfulLength = length;
    } else {
      firstFailureLength = length;
      break; // Stop at first failure
    }

    // Wait a bit between calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESULTS:');
  console.log(`   Last successful prompt length: ${lastSuccessfulLength} characters`);
  if (firstFailureLength > 0) {
    console.log(`   First failed prompt length: ${firstFailureLength} characters`);
    console.log(`   Estimated limit: ${lastSuccessfulLength}-${firstFailureLength} characters`);
  } else {
    console.log(`   All tests passed! Limit is > ${lastSuccessfulLength} characters`);
  }

  // Convert to tokens (rough estimate)
  const estimatedTokens = Math.floor(lastSuccessfulLength / 4);
  console.log(`   Estimated token usage: ~${estimatedTokens.toLocaleString()} tokens`);
}

findPromptLimit().catch(console.error);
