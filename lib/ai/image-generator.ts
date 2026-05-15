/**
 * Unified Image Generator
 * Parallel generation with AI33 + Google Gemini and circuit breaker pattern
 *
 * Fast Mode (stableMode: false):
 * - Calls AI33 and Google in PARALLEL using Promise.race()
 * - First successful response wins
 * - Circuit breaker skips unhealthy APIs
 * - Higher cost but faster and more reliable
 *
 * Stable Mode (stableMode: true):
 * - Only calls Google Gemini (cheapest option)
 * - Uses 3-model fallback within Google (Flash → Pro → Stable)
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
 * Circuit breaker state for API health tracking
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean; // true = circuit open (skip this API)
}

/**
 * Unified image generator with AI33 + Google parallel generation and circuit breaker
 */
export class UnifiedImageGenerator {
  private googleApiKey: string;
  private ai33Client?: AI33Client;
  private useAI33: boolean;

  // Circuit breaker state (in-memory, resets on restart)
  private circuitBreakers: {
    ai33: CircuitBreakerState;
    google: CircuitBreakerState;
  } = {
    ai33: { failures: 0, lastFailureTime: 0, isOpen: false },
    google: { failures: 0, lastFailureTime: 0, isOpen: false },
  };

  private readonly CIRCUIT_BREAKER_THRESHOLD = 3; // failures before opening circuit
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute cooldown

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
   * Check if circuit breaker should allow API call
   */
  private canCallAPI(provider: 'ai33' | 'google'): boolean {
    const breaker = this.circuitBreakers[provider];

    // If circuit is open, check if cooldown has expired
    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceLastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
        // Reset circuit breaker (half-open state)
        console.log(`   🔄 Circuit breaker for ${provider} reset after cooldown`);
        breaker.failures = 0;
        breaker.isOpen = false;
        return true;
      }
      console.log(`   ⚠️  Circuit breaker OPEN for ${provider} (cooling down...)`);
      return false;
    }

    return true;
  }

  /**
   * Record API call success
   */
  private recordSuccess(provider: 'ai33' | 'google'): void {
    const breaker = this.circuitBreakers[provider];
    breaker.failures = 0;
    breaker.isOpen = false;
  }

  /**
   * Record API call failure
   */
  private recordFailure(provider: 'ai33' | 'google'): void {
    const breaker = this.circuitBreakers[provider];
    breaker.failures += 1;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.isOpen = true;
      console.warn(`   🚨 Circuit breaker OPENED for ${provider} after ${breaker.failures} failures`);
    }
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
   * Generate image with parallel generation and circuit breaker
   *
   * Fast Mode (forceStableMode: false):
   * - Calls AI33 and Google in PARALLEL using Promise.race()
   * - First successful response wins
   * - Circuit breaker skips unhealthy APIs
   * - Higher cost but faster and more reliable
   *
   * Stable Mode (forceStableMode: true):
   * - Only calls Google Gemini (cheapest option)
   * - Uses 3-model fallback within Google (Flash → Pro → Stable)
   */
  async generateImage(request: GoogleImageGenerationRequest, forceStableMode = false): Promise<GenerationResult> {
    const usingStableMode = forceStableMode || !this.useAI33 || !this.ai33Client;

    console.log(usingStableMode
      ? '🎨 Starting image generation with Google Gemini (Stable Mode)...'
      : '🎨 Starting PARALLEL generation with AI33 + Google Gemini (Fast Mode)...'
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
    const resolutionBaseCredits = resolution === '512' ? 1 : resolution === '1K' ? 2 : 3;

    // STABLE MODE: Google only (cheapest)
    if (usingStableMode) {
      console.log('   → Generating with Google Gemini (3-model fallback enabled)...');

      if (!this.canCallAPI('google')) {
        throw new Error('Google API is currently unavailable (circuit breaker open). Please try again later.');
      }

      try {
        const { buffer, fallbackUsed, fallbackMessage } = await callNanaBanana(request, this.googleApiKey);

        this.recordSuccess('google');
        console.log('✓ Google Gemini generation successful');

        return {
          buffer,
          provider: 'google',
          fallbackUsed,
          fallbackMessage,
          lateAI33Available: false,
          cost: {
            amount: resolutionBaseCredits * 0.0336, // Google Flash base cost
            currency: 'USD',
          },
        };
      } catch (error) {
        this.recordFailure('google');
        throw error;
      }
    }

    // FAST MODE: Parallel generation with AI33 + Google
    console.log('   🏁 Racing AI33 vs Google Gemini...');

    const promises: Array<Promise<{ buffer: Buffer; provider: 'ai33' | 'google'; fallbackMessage?: string }>> = [];

    // Promise 1: AI33 generation
    if (this.canCallAPI('ai33') && this.ai33Client) {
      console.log('   → AI33 starting...');
      promises.push(
        (async () => {
          try {
            const buffer = await this.ai33Client!.generateImage({
              prompt: request.prompt,
              width: 1280,
              height: 720,
              referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
              resolution,
            });

            this.recordSuccess('ai33');
            return { buffer, provider: 'ai33' as const };
          } catch (error) {
            this.recordFailure('ai33');
            const errorMsg = error instanceof Error ? error.message : String(error);

            // If prompt error, don't let it fail silently in the race
            if (this.isPromptError(errorMsg)) {
              throw new Error(`AI33 content policy violation: ${errorMsg}`);
            }

            // API error - log and reject so Google can win the race
            console.error(`   ✗ AI33 failed: ${errorMsg}`);
            throw error;
          }
        })()
      );
    }

    // Promise 2: Google Gemini generation
    if (this.canCallAPI('google')) {
      console.log('   → Google Gemini starting...');
      promises.push(
        (async () => {
          try {
            const { buffer, fallbackUsed, fallbackMessage } = await callNanoBanana(request, this.googleApiKey);

            this.recordSuccess('google');
            return { buffer, provider: 'google' as const, fallbackMessage };
          } catch (error) {
            this.recordFailure('google');
            throw error;
          }
        })()
      );
    }

    if (promises.length === 0) {
      throw new Error('All providers are unavailable (circuit breakers open). Please try again later.');
    }

    // Race the promises - first to succeed wins
    try {
      const result = await Promise.race(promises);

      console.log(`✅ ${result.provider.toUpperCase()} won the race!`);

      return {
        buffer: result.buffer,
        provider: result.provider,
        fallbackUsed: promises.length > 1, // true if we raced multiple providers
        fallbackMessage: result.fallbackMessage || `Generated with ${result.provider} in Fast Mode (parallel generation)`,
        lateAI33Available: false,
        cost: {
          amount: result.provider === 'ai33' ? resolutionBaseCredits * 0.01 : resolutionBaseCredits * 0.0336,
          currency: 'USD',
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('✗ All providers failed in parallel generation');
      throw new Error(`All providers failed: ${errorMsg}`);
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
