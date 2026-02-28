import { GoogleGenAI } from '@google/genai';
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import type { AIRequestPayload } from './payload-engine';

/**
 * Structured error information from Google API calls
 */
export interface GoogleAPIError {
  statusCode?: number;
  message: string;
  rawResponse?: unknown;
}

/**
 * Initializes Google Gen AI client with API key
 * @param apiKey - Google API key
 * @returns Configured GoogleGenAI client instance
 */
export function initializeClient(apiKey: string): GoogleGenAI {
  if (!apiKey) {
    throw new Error('Google API key is required');
  }
  return new GoogleGenAI({ apiKey: apiKey });
}

/**
 * Calls the Nano Banana (gemini-3-pro-image-preview) model to generate a thumbnail image
 *
 * Nano Banana is a multimodal Gemini model that supports multi-image fusion and character consistency.
 * It uses generateContent (not generateImages) with responseModalities: ["IMAGE"].
 *
 * @param payload - Complete AI request payload with prompts and base64 images
 * @param apiKey - Google API key
 * @returns Image buffer containing the generated thumbnail
 * @throws Error with structured information if API call fails
 */
export async function callNanoBanana(
  payload: AIRequestPayload,
  apiKey: string
): Promise<Buffer> {
  try {
    const ai = initializeClient(apiKey);

    // Format reference images: archetype, persona, and optional logo
    const imageParts: any[] = [
      {
        inlineData: {
          data: payload.base64Images.archetype,
          mimeType: 'image/jpeg'
        }
      },
      {
        inlineData: {
          data: payload.base64Images.persona,
          mimeType: 'image/jpeg'
        }
      }
    ];

    if (payload.base64Images.logo) {
      imageParts.push({
        inlineData: {
          data: payload.base64Images.logo,
          mimeType: 'image/png'
        }
      });
    }

    // Merge system and user prompts
    const fullPrompt = `${payload.systemPrompt}\n\n${payload.userPrompt}`;

    console.log('   Calling Nano Banana (imagen-3.0-generate-001)...');
    console.log(`   Prompt length: ${fullPrompt.length} characters`);
    console.log(`   Reference images: ${imageParts.length}`);

    // Nano Banana uses generateContent with responseModalities set to IMAGE
    const response = await ai.models.generateContent({
      model: 'imagen-3.0-generate-001',
      contents: [
        fullPrompt,
        ...imageParts
      ],
      config: {
        responseModalities: ["IMAGE"],
        imageGenerationConfig: {
          aspectRatio: "16:9"  // YouTube standard
        }
      } as any
    });

    // Check for content blocking/safety filters
    if (response.promptFeedback && response.promptFeedback.blockReason) {
      const blockReason = response.promptFeedback.blockReason;
      throw new Error(
        `Content generation was blocked by Google's safety filters.\n` +
        `Block Reason: ${blockReason}\n` +
        `This could be due to:\n` +
        `  - Prompt content violating Google's policies\n` +
        `  - Input images triggering safety filters\n` +
        `  - Combination of prompt + images flagged as unsafe\n` +
        `\n` +
        `Try:\n` +
        `  1. Simplifying the prompt (remove bold/marketing language)\n` +
        `  2. Using different test images\n` +
        `  3. Testing with a minimal prompt like "Create a YouTube thumbnail"\n` +
        `\n` +
        `Usage: ${response.usageMetadata?.totalTokenCount || 0} tokens processed`
      );
    }

    // Extract the base64 image data from the response part
    if (!response.candidates || response.candidates.length === 0) {
      console.log('');
      console.log('DEBUG: Full API response:');
      console.log(JSON.stringify(response, null, 2));
      console.log('');
      throw new Error('API returned successfully, but no candidates were found in the response.');
    }

    const firstCandidate = response.candidates[0];
    if (!firstCandidate.content || !firstCandidate.content.parts || firstCandidate.content.parts.length === 0) {
      throw new Error('API returned successfully, but no content parts were found in the response.');
    }

    const firstPart = firstCandidate.content.parts[0];
    if (!firstPart.inlineData || !firstPart.inlineData.data) {
      throw new Error('API returned successfully, but no image data was found in the response.');
    }

    const base64Data = firstPart.inlineData.data;
    console.log(`   ✓ Received image data: ${base64Data.length} characters (base64)`);

    // Convert base64 to Buffer
    return Buffer.from(base64Data, 'base64');

  } catch (error) {
    const apiError = handleAPIError(error);

    // Log full error details for debugging
    console.error('');
    console.error('API call failed:', {
      statusCode: apiError.statusCode,
      message: apiError.message,
    });

    if (apiError.rawResponse) {
      console.error('');
      console.error('Full error.response object:');
      console.error(JSON.stringify(apiError.rawResponse, null, 2));
    }

    throw new Error(
      `Nano Banana API call failed: ${apiError.message}` +
      (apiError.statusCode ? ` (Status: ${apiError.statusCode})` : '')
    );
  }
}

/**
 * Extracts structured error information from API call failures
 * @param error - Unknown error object from try/catch
 * @returns Structured GoogleAPIError with status code, message, and raw response
 */
export function handleAPIError(error: unknown): GoogleAPIError {
  // Handle Google AI SDK errors
  if (error && typeof error === 'object') {
    const err = error as any;

    return {
      statusCode: err.status || err.statusCode || err.code,
      message: err.message || String(error),
      rawResponse: err.response || err,
    };
  }

  return {
    message: String(error),
    rawResponse: error,
  };
}

/**
 * Saves image buffer to filesystem
 * @param buffer - Image data buffer
 * @param outputPath - Destination file path (relative or absolute)
 */
export async function saveOutputBuffer(
  buffer: Buffer,
  outputPath: string
): Promise<void> {
  try {
    const absolutePath = resolve(outputPath);

    // Ensure output directory exists
    const dir = dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });

    // Write buffer to file
    await fs.writeFile(absolutePath, buffer);

    console.log(`✓ Successfully saved thumbnail to: ${absolutePath}`);
  } catch (error) {
    throw new Error(
      `Failed to save output file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
