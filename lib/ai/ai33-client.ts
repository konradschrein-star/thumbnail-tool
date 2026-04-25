/**
 * AI33 Image Generation Client (Updated for ai33.pro API)
 * Provides low-cost image generation using ByteDance SeeDream model
 *
 * API Flow:
 * 1. POST /v1i/task/generate-image → get task_id
 * 2. Poll GET /v1/task/:task_id until status='done'
 * 3. Retrieve image URL from metadata.result_images
 */

export interface AI33GenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  referenceImages?: string[]; // Array of local file paths or URLs for reference images
}

export interface AI33ClientConfig {
  apiKey: string;
  baseUrl?: string;
  pollingIntervalMs?: number;
  maxPollingAttempts?: number;
}

interface AI33TaskResponse {
  success: boolean;
  task_id: string;
  estimated_credits: number;
}

interface AI33StatusResponse {
  id: string;
  type: string;
  status: 'doing' | 'done' | 'error';
  progress: number;
  credit_cost?: number;
  error_message?: string;
  metadata?: {
    result_images?: Array<{
      imageUrl: string;
      width: number;
      height: number;
    }>;
  };
}

/**
 * AI33 Client for text-to-image generation using ByteDance SeeDream
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
    this.baseUrl = config.baseUrl || 'https://api.ai33.pro';
    this.pollingIntervalMs = config.pollingIntervalMs || 3000; // 3 seconds
    this.maxPollingAttempts = config.maxPollingAttempts || 100; // 5 minutes max (increased for high-load periods)
  }

  /**
   * Generate image using AI33 API
   */
  async generateImage(request: AI33GenerationRequest): Promise<Buffer> {
    console.log('   Submitting request to AI33...');

    // Determine aspect ratio from dimensions
    const width = request.width || 1024;
    const height = request.height || 1024;
    const aspectRatio = this.getAspectRatio(width, height);

    // Submit generation request
    const taskId = await this.submitGenerationRequest({
      prompt: request.prompt,
      aspectRatio,
      referenceImages: request.referenceImages,
    });

    console.log(`   Task ID: ${taskId}`);

    // Poll for completion
    const imageUrl = await this.pollForCompletion(taskId);

    // Download generated image
    console.log('   Downloading generated image...');
    const imageBuffer = await this.downloadImage(imageUrl);

    console.log(`   ✓ Generated image: ${(imageBuffer.length / 1024).toFixed(1)}KB`);

    return imageBuffer;
  }

  /**
   * Convert dimensions to AI33 aspect ratio string
   */
  private getAspectRatio(width: number, height: number): string {
    const ratio = width / height;

    if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
    if (Math.abs(ratio - 4/3) < 0.1) return '4:3';
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 3/4) < 0.1) return '3:4';
    if (Math.abs(ratio - 9/16) < 0.1) return '9:16';

    // Default to square
    return '1:1';
  }

  /**
   * Submit generation request to AI33
   */
  private async submitGenerationRequest(params: {
    prompt: string;
    aspectRatio: string;
    referenceImages?: string[];
  }): Promise<string> {
    try {
      const formData = new FormData();

      // Build prompt with @img references matching the number of assets
      let finalPrompt = params.prompt;
      if (params.referenceImages && params.referenceImages.length > 0) {
        // Add @img1 reference for archetype
        finalPrompt = `Create a YouTube thumbnail matching the style and layout of @img1. ${params.prompt}`;
      }

      formData.append('prompt', finalPrompt);
      formData.append('model_id', 'bytedance-seedream-4.5');
      formData.append('generations_count', '1');
      formData.append('model_parameters', JSON.stringify({
        aspect_ratio: params.aspectRatio,
        resolution: '2K',
      }));

      // Attach reference images as separate 'assets' fields
      if (params.referenceImages && params.referenceImages.length > 0) {
        const fs = await import('fs');
        for (let i = 0; i < params.referenceImages.length; i++) {
          const imagePath = params.referenceImages[i];
          const imageBuffer = fs.readFileSync(imagePath);
          const blob = new Blob([imageBuffer], { type: 'image/png' });
          // Each asset is a separate 'assets' field as per API spec
          formData.append('assets', blob, `reference-${i + 1}.png`);
          console.log(`   📎 Attached reference @img${i + 1}: ${imagePath}`);
        }
      }

      const response = await fetch(`${this.baseUrl}/v1i/task/generate-image`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `AI33 submission failed with status ${response.status}: ${errorText}`
        );
      }

      const data = (await response.json()) as AI33TaskResponse;

      if (!data.success || !data.task_id) {
        throw new Error('AI33 returned invalid response');
      }

      return data.task_id;
    } catch (error) {
      throw new Error(
        `Failed to submit request to AI33: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Poll task status until completion
   */
  private async pollForCompletion(taskId: string): Promise<string> {
    let attempts = 0;

    while (attempts < this.maxPollingAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/v1/task/${taskId}`, {
          method: 'GET',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Status check failed with status ${response.status}: ${response.statusText}`
          );
        }

        const status = (await response.json()) as AI33StatusResponse;

        if (status.status === 'done') {
          if (!status.metadata?.result_images || status.metadata.result_images.length === 0) {
            throw new Error('Generation completed but no images returned');
          }

          console.log(`   ✓ Generation completed after ${attempts + 1} attempts`);
          return status.metadata.result_images[0].imageUrl;
        }

        if (status.status === 'error') {
          throw new Error(`Generation failed: ${status.error_message || 'Unknown error'}`);
        }

        // Still processing
        attempts++;

        if (attempts < this.maxPollingAttempts) {
          console.log(
            `   ⏳ Progress: ${status.progress}%... retrying in ${(this.pollingIntervalMs / 1000).toFixed(1)}s`
          );
          await new Promise(resolve => setTimeout(resolve, this.pollingIntervalMs));
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
   * Download image from URL
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
 * Factory function to create AI33 client
 */
export function initializeAI33Client(apiKey?: string): AI33Client {
  const key = apiKey || process.env.AI33_API_KEY;

  if (!key) {
    throw new Error('AI33_API_KEY must be provided or set in environment variables');
  }

  return new AI33Client({
    apiKey: key,
    pollingIntervalMs: 3000,
    maxPollingAttempts: 100, // 5 minutes timeout
  });
}
