/**
 * AI33 Image Generation Client
 * Provides low-cost ($0.01/image) image generation with 1K resolution
 *
 * AI33 uses a polling-based model:
 * 1. Submit request → get UUID
 * 2. Poll status endpoint until complete
 * 3. Retrieve generated image via signed URL
 */

import { promises as fs } from 'fs';

export interface AI33GenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  batchSize?: number;
}

export interface AI33GenerationResponse {
  uuid: string;
  status: 'created' | 'processing' | 'completed' | 'failed';
}

export interface AI33StatusResponse {
  uuid: string;
  status: 'created' | 'processing' | 'completed' | 'failed';
  images?: Array<{
    url: string;
    seed: number;
  }>;
  error?: string;
}

export interface AI33ClientConfig {
  apiKey: string;
  baseUrl?: string;
  pollingIntervalMs?: number;
  maxPollingAttempts?: number;
}

/**
 * AI33 Client for text-to-image generation
 * Supports 1K (1024x1024) resolution at ultra-low cost ($0.01/image)
 */
export class AI33Client {
  private apiKey: string;
  private baseUrl: string;
  private pollingIntervalMs: number;
  private maxPollingAttempts: number;

  constructor(config: AI33ClientConfig) {
    if (!config.apiKey) {
      throw new Error('AI33_API_KEY is required for AI33Client');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.ai33.io/v1';
    this.pollingIntervalMs = config.pollingIntervalMs || 2000; // 2 seconds
    this.maxPollingAttempts = config.maxPollingAttempts || 120; // 4 minutes max
  }

  /**
   * Submit image generation request and poll until completion
   * @param request - Generation request with prompt and optional dimensions
   * @returns Buffer containing generated image data
   */
  async generateImage(request: AI33GenerationRequest): Promise<Buffer> {
    console.log('   Submitting request to AI33...');

    // Submit generation request
    const submissionResponse = await this.submitGenerationRequest({
      prompt: request.prompt,
      width: request.width || 1024,
      height: request.height || 1024,
      batchSize: request.batchSize || 1,
    });

    const uuid = submissionResponse.uuid;
    console.log(`   Generation UUID: ${uuid}`);

    // Poll for completion
    const imageUrl = await this.pollForCompletion(uuid);

    // Download generated image
    console.log('   Downloading generated image...');
    const imageBuffer = await this.downloadImage(imageUrl);

    console.log(`   ✓ Generated image: ${(imageBuffer.length / 1024).toFixed(1)}KB`);

    return imageBuffer;
  }

  /**
   * Submit a generation request to AI33
   * Returns immediately with UUID for polling
   */
  private async submitGenerationRequest(request: {
    prompt: string;
    width: number;
    height: number;
    batchSize: number;
  }): Promise<AI33GenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/image/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          width: request.width,
          height: request.height,
          batchSize: request.batchSize,
          model: 'flux-pro', // Use fast/efficient model
        }),
      });

      if (!response.ok) {
        throw new Error(
          `AI33 submission failed with status ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        uuid: data.uuid,
        status: data.status || 'created',
      };
    } catch (error) {
      throw new Error(
        `Failed to submit request to AI33: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Poll status endpoint until generation completes
   * Implements exponential backoff for retry logic
   */
  private async pollForCompletion(uuid: string): Promise<string> {
    let attempts = 0;

    while (attempts < this.maxPollingAttempts) {
      try {
        const statusResponse = await fetch(`${this.baseUrl}/image/status?uuid=${uuid}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });

        if (!statusResponse.ok) {
          throw new Error(
            `Status check failed with status ${statusResponse.status}: ${statusResponse.statusText}`
          );
        }

        const status = (await statusResponse.json()) as AI33StatusResponse;

        if (status.status === 'completed') {
          if (!status.images || status.images.length === 0) {
            throw new Error('Generation completed but no images returned');
          }

          console.log(`   ✓ Generation completed after ${attempts + 1} attempts`);
          return status.images[0].url;
        }

        if (status.status === 'failed') {
          throw new Error(`Generation failed: ${status.error || 'Unknown error'}`);
        }

        // Still processing, wait and retry
        attempts++;

        if (attempts < this.maxPollingAttempts) {
          const waitMs = Math.min(
            this.pollingIntervalMs * Math.pow(1.1, attempts),
            10000 // Cap at 10 seconds
          );

          console.log(
            `   ⏳ Still processing (${status.status})... retrying in ${(waitMs / 1000).toFixed(1)}s`
          );

          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      } catch (error) {
        throw new Error(
          `Error polling AI33 status: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    throw new Error(
      `Generation did not complete within ${(this.maxPollingAttempts * this.pollingIntervalMs) / 1000} seconds`
    );
  }

  /**
   * Download image from signed URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Image download failed with status ${response.status}: ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new Error(
        `Failed to download image from AI33: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Factory function to create and validate AI33 client
 */
export function initializeAI33Client(apiKey?: string): AI33Client {
  const key = apiKey || process.env.AI33_API_KEY;

  if (!key) {
    throw new Error(
      'AI33_API_KEY must be provided or set in environment variables'
    );
  }

  return new AI33Client({
    apiKey: key,
    pollingIntervalMs: 2000,
    maxPollingAttempts: 120,
  });
}
