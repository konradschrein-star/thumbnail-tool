/**
 * Binary search to find exact character limit for Nano Banana 2
 */

import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.AI33_API_KEY;

async function testLength(length: number): Promise<{ success: boolean; tokens?: number }> {
  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY! });
    const prompt = "X".repeat(length);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["IMAGE"],
        imageGenerationConfig: { aspectRatio: "16:9", resolution: "512" }
      } as any
    });

    const tokens = response.usageMetadata?.promptTokenCount || 0;
    return { success: true, tokens };
  } catch (error: any) {
    return { success: false };
  }
}

async function binarySearch() {
  let low = 100_000;  // Known to work
  let high = 500_000; // Known to fail
  let bestWorking = low;
  let bestTokens = 0;

  console.log('🔍 Binary search for exact character limit\n');
  console.log('='.repeat(60));

  while (high - low > 1000) { // Search until within 1000 chars
    const mid = Math.floor((low + high) / 2);
    console.log(`\n📝 Testing ${mid.toLocaleString()} chars...`);

    const result = await testLength(mid);

    if (result.success) {
      console.log(`   ✅ SUCCESS - ${result.tokens} tokens`);
      bestWorking = mid;
      bestTokens = result.tokens || 0;
      low = mid;
    } else {
      console.log(`   ❌ FAILED`);
      high = mid;
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎯 FINAL RESULT:\n');
  console.log(`Maximum working prompt length: ${bestWorking.toLocaleString()} characters`);
  console.log(`Tokens used: ${bestTokens.toLocaleString()}`);
  console.log(`Char/Token ratio: ${(bestWorking / bestTokens).toFixed(2)}`);
  console.log(`\nToken limit: 65,536 tokens (confirmed from API error)`);
  console.log(`Estimated max characters: ~${(65536 * (bestWorking / bestTokens)).toLocaleString()} (at current ratio)`);
}

binarySearch().catch(console.error);
