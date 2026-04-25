/**
 * Fast test to find the actual prompt length limit for Nano Banana 2
 * Tests only key lengths to find the breaking point quickly
 */

import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.AI33_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY or AI33_API_KEY not found in .env file');
  process.exit(1);
}

async function testPromptLength(promptLength: number): Promise<{ success: boolean; tokens?: number; error?: string }> {
  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY! });

    // Generate a prompt of specific length using simple repetition
    const prompt = "X".repeat(promptLength);

    console.log(`\n📝 Testing ${promptLength.toLocaleString()} characters...`);

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
          resolution: "512"
        }
      } as any
    });

    if (response.candidates && response.candidates.length > 0) {
      const tokens = response.usageMetadata?.promptTokenCount || 0;
      console.log(`   ✅ SUCCESS - Input tokens: ${tokens}`);
      return { success: true, tokens };
    } else {
      console.log(`   ❌ FAILED - No candidates`);
      return { success: false, error: 'No candidates' };
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.log(`   ❌ FAILED - ${errorMsg.slice(0, 150)}`);
    return { success: false, error: errorMsg };
  }
}

async function main() {
  console.log('🔬 Fast Prompt Limit Test for Nano Banana 2\n');
  console.log('='.repeat(60));

  // Test strategic lengths to find the breaking point
  // Based on 131K token limit and ~6 chars/token ratio, expect ~786,000 char limit
  const testLengths = [
    10_000,    // 10K - should pass
    50_000,    // 50K - should pass
    100_000,   // 100K - should pass
    500_000,   // 500K - should pass
    800_000,   // 800K - near theoretical limit
    1_000_000, // 1M - should fail?
  ];

  const results: Array<{ length: number; success: boolean; tokens?: number }> = [];

  for (const length of testLengths) {
    const result = await testPromptLength(length);
    results.push({ length, success: result.success, tokens: result.tokens });

    if (!result.success) {
      console.log(`\n🛑 Found failure point at ${length.toLocaleString()} characters`);
      break;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESULTS:\n');

  const lastSuccess = results.filter(r => r.success).pop();
  const firstFailure = results.find(r => !r.success);

  if (lastSuccess) {
    console.log(`✅ Last successful: ${lastSuccess.length.toLocaleString()} chars (${lastSuccess.tokens || '?'} tokens)`);
    const ratio = lastSuccess.tokens ? (lastSuccess.length / lastSuccess.tokens).toFixed(2) : '?';
    console.log(`   Char/Token ratio: ${ratio}`);
  }

  if (firstFailure) {
    console.log(`\n❌ First failure: ${firstFailure.length.toLocaleString()} chars`);
    console.log(`\n💡 Estimated limit: between ${lastSuccess?.length.toLocaleString() || 0} and ${firstFailure.length.toLocaleString()} characters`);
  } else {
    console.log(`\n✅ All tests passed! Limit is > ${lastSuccess?.length.toLocaleString() || 0} characters`);
  }
}

main().catch(console.error);
