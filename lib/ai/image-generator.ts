/**
 * Unified Image Generator
 * AI33 with aggressive Google Gemini fallback
 *
 * Strategy:
 * 1. Try AI33 with 2-minute timeout
 * 2. If timeout or API error (not prompt-related), immediately switch to Google Gemini
 * 3. Continue monitoring AI33 in background for up to 4 minutes total
 * 4. If AI33 completes late, provide as bonus output (deduct 1 more credit)
 * 5. Google Gemini is the reliable primary backup
 */

import { AI33Client, initializeAI33Client } from './ai33-client';
import { callNanoBanana, GoogleImageGenerationRequest } from './google-client';

export interface GenerationResult {
  buffer: Buffer;
  provider: 'ai33' | 'google';
  fallbackUsed: boolean;
  fallbackMessage?: string;
  lateAI33Buffer?: Buffer; // AI33 result that completed after timeout
  lateAI33Available: boolean; // Whether to expect a late AI33 result
  cost: {
    amount: number;
    currency: string;
  };
}

export interface UnifiedGeneratorConfig {
  googleApiKey: string;
  ai33ApiKey?: string; // Optional, falls back to Google if not provided
  forceStableMode?: boolean; // If true, skip AI33 and use Google directly
}

/**
 * Unified image generator with AI33 → Google fallback
 */
export class UnifiedImageGenerator {
  private googleApiKey: string;
  private ai33Client?: AI33Client;
  private useAI33: boolean;

  constructor(config: UnifiedGeneratorConfig) {
    if (!config.googleApiKey) {
      throw new Error('googleApiKey is required');
    }

    this.googleApiKey = config.googleApiKey;
    this.useAI33 = !!config.ai33ApiKey;

    if (this.useAI33) {
      try {
        this.ai33Client = initializeAI33Client(config.ai33ApiKey);
      } catch (error) {
        console.warn(
          `Failed to initialize AI33 client: ${error instanceof Error ? error.message : String(error)}. Will use Google only.`
        );
        this.useAI33 = false;
      }
    }
  }

  /**
   * Timeout wrapper for promises
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Check if error is prompt-related (content policy) vs API-related
   */
  private isPromptError(errorMsg: string): boolean {
    const promptErrorKeywords = [
      'safety',
      'blocked',
      'BLOCKED_REASON',
      'SAFETY',
      'content policy',
      'inappropriate',
      'violates',
    ];
    return promptErrorKeywords.some(keyword => errorMsg.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * Check if error is API-related (should trigger fallback)
   */
  private isAPIError(errorMsg: string): boolean {
    const apiErrorKeywords = [
      '404',
      '401',
      '403',
      '500',
      '502',
      '503',
      'timeout',
      'TIMEOUT',
      'did not complete',
      'API error',
      'Invalid API key',
      'insufficient credits',
      'server error',
      'INTERNAL',
      'UNAVAILABLE',
    ];
    return apiErrorKeywords.some(keyword => errorMsg.includes(keyword));
  }

  /**
   * Generate image with aggressive Google fallback
   * Strategy:
   * 1. Try AI33 with 2-minute timeout
   * 2. On timeout or API error, immediately switch to Google Gemini
   * 3. If AI33 later completes (within 4 min total), provide as bonus output
   */
  async generateImage(request: GoogleImageGenerationRequest, forceStableMode = false): Promise<GenerationResult> {
    const usingStableMode = forceStableMode || !this.useAI33 || !this.ai33Client;

    console.log(usingStableMode
      ? '🎨 Starting image generation with Google Gemini (Stable Mode)...'
      : '🎨 Starting image generation with AI33 (2min timeout) + Google Gemini fallback...'
    );

    // Collect reference images
    const referenceImages: string[] = [];
    if (request.referenceImageUrl) {
      referenceImages.push(request.referenceImageUrl);
      console.log(`   📎 Archetype reference: ${request.referenceImageUrl}`);
    }
    if (request.personaImageUrl) {
      referenceImages.push(request.personaImageUrl);
      console.log(`   📎 Persona reference: ${request.personaImageUrl}`);
    }
    if (request.logoImageUrl) {
      referenceImages.push(request.logoImageUrl);
      console.log(`   📎 Logo reference: ${request.logoImageUrl}`);
    }

    const resolution = request.resolution || '1K';
    // Credit calculation: 512=1, 1K=2, 2K=3 (base)
    const resolutionBaseCredits = resolution === '512' ? 1 : resolution === '1K' ? 2 : 3;
    const baseCredits = referenceImages.length > 0 ? referenceImages.length : 1;
    const creditCost = baseCredits * resolutionBaseCredits;

    // Skip AI33 if stable mode is enabled
    if (!usingStableMode && this.useAI33 && this.ai33Client) {
      try {
        console.log(`   → Attempting AI33 generation (2-minute timeout, ${resolution} resolution)...`);

        const buffer = await this.withTimeout(
          this.ai33Client.generateImage({
            prompt: request.prompt,
            width: 1280,
            height: 720,
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            resolution,
          }),
          120000, // 2 minutes
          'AI33 generation timeout (2 minutes)'
        );

        console.log('✓ AI33 generation successful (within 2 minutes)');

        return {
          buffer,
          provider: 'ai33',
          fallbackUsed: false,
          lateAI33Available: false,
          cost: {
            amount: creditCost * 0.01,
            currency: 'USD',
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        // Check if it's a prompt error (don't fall back, just fail)
        if (this.isPromptError(errorMsg)) {
          console.error(`   ✗ AI33 generation failed (prompt/content policy): ${errorMsg}`);
          throw new Error(`Content policy violation: ${errorMsg}`);
        }

        // API error or timeout - fall back to Google immediately
        console.warn(`   ⚠️ AI33 ${errorMsg.includes('timeout') ? 'timeout' : 'API error'}: ${errorMsg}`);
        console.log('   → Switching to Google Gemini (reliable backup)...');
      }
    }

    // Fall back to Google Gemini (reliable backup)
    try {
      console.log('   → Generating with Google Gemini...');
      const { buffer, fallbackUsed, fallbackMessage } = await callNanoBanana(request, this.googleApiKey);

      console.log('✓ Google Gemini generation successful');

      return {
        buffer,
        provider: 'google',
        fallbackUsed: true,
        fallbackMessage: this.useAI33
          ? 'AI33 timeout/error - used Google Gemini as backup'
          : fallbackMessage,
        lateAI33Available: false,
        cost: {
          amount: 0.0672, // Google Gemini cost
          currency: 'USD',
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('✗ Google Gemini generation failed');
      throw new Error(`Image generation failed: ${errorMsg}`);
    }
  }
}

/**
 * Factory function to create unified generator
 */
export function createUnifiedGenerator(config: UnifiedGeneratorConfig): UnifiedImageGenerator {
  return new UnifiedImageGenerator(config);
}

/**
 * Factory function using environment variables
 */
export function createUnifiedGeneratorFromEnv(): UnifiedImageGenerator {
  const googleApiKey = process.env.GOOGLE_API_KEY;
  if (!googleApiKey) {
    throw new Error('GOOGLE_API_KEY environment variable is required');
  }

  return new UnifiedImageGenerator({
    googleApiKey,
    ai33ApiKey: process.env.AI33_API_KEY,
  });
}
