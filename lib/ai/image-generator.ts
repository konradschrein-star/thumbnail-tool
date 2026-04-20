/**
 * Unified Image Generator
 * Provides automatic fallback from AI33 (low-cost) to Google Gemini (reliable)
 *
 * Strategy:
 * 1. Try AI33 first (lowest cost at $0.01/image with 1K resolution)
 * 2. Fall back to Google Gemini if AI33 fails (most reliable)
 * 3. Transparent error handling with detailed logging
 */

import { AI33Client, initializeAI33Client } from './ai33-client';
import { callNanoBanana, GoogleImageGenerationRequest } from './google-client';

export interface GenerationResult {
  buffer: Buffer;
  provider: 'ai33' | 'google';
  fallbackUsed: boolean;
  fallbackMessage?: string;
  cost: {
    amount: number;
    currency: string;
  };
}

export interface UnifiedGeneratorConfig {
  googleApiKey: string;
  ai33ApiKey?: string; // Optional, falls back to Google if not provided
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
   * Generate image with automatic fallback
   * Tries AI33 first, falls back to Google Gemini if needed
   */
  async generateImage(request: GoogleImageGenerationRequest): Promise<GenerationResult> {
    console.log('🎨 Starting image generation with fallback strategy...');

    // Try AI33 first if available
    if (this.useAI33 && this.ai33Client) {
      try {
        console.log('   → Attempting AI33 generation (low-cost provider)...');
        const buffer = await this.ai33Client.generateImage({
          prompt: request.prompt,
          width: 1024,
          height: 1024,
        });

        console.log('✓ AI33 generation successful');

        return {
          buffer,
          provider: 'ai33',
          fallbackUsed: false,
          cost: {
            amount: 0.01,
            currency: 'USD',
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`   ⚠️ AI33 generation failed: ${errorMsg}`);
        console.log('   → Falling back to Google Gemini...');
      }
    }

    // Fall back to Google Gemini
    try {
      console.log('   → Attempting Google Gemini generation (reliable fallback)...');
      const { buffer, fallbackUsed, fallbackMessage } = await callNanoBanana(request, this.googleApiKey);

      console.log('✓ Google Gemini generation successful');

      return {
        buffer,
        provider: 'google',
        fallbackUsed: fallbackUsed || this.useAI33, // Mark as fallback if we used it due to AI33 failure
        fallbackMessage,
        cost: {
          amount: 0.0672, // Nano Banana 2 (Flash) cost
          currency: 'USD',
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('✗ All generation providers failed');
      throw new Error(
        `Image generation failed with all providers:\n  AI33: ${this.useAI33 ? 'Attempted' : 'Not configured'}\n  Google: ${errorMsg}`
      );
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
