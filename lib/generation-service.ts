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
): Promise<{ buffer: Buffer; fallbackUsed: boolean; fallbackMessage?: string }> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const fullPrompt = `System:\n${payload.systemPrompt}\n\nUser:\n${payload.userPrompt}`;

    const imageParts: { inlineData: { data: string; mimeType: string } }[] = [];
    if (payload.base64Images?.archetype) {
      imageParts.push({ inlineData: { data: payload.base64Images.archetype.data, mimeType: "image/png" } });
    }
    if (payload.base64Images?.persona) {
      imageParts.push({ inlineData: { data: payload.base64Images.persona.data, mimeType: "image/png" } });
    }
    if (payload.base64Images?.logo) {
      imageParts.push({ inlineData: { data: payload.base64Images.logo.data, mimeType: "image/png" } });
    }

    // Unified multi-part content (RELEVENT: Gemini preview models often fail if parts are split across messages)
    const primaryContent = {
      role: 'user',
      parts: [
        { text: fullPrompt },
        ...imageParts.map(p => ({ inlineData: p.inlineData }))
      ]
    };

    const callWithPayload = async (content: any, modelName: string = 'gemini-3-pro-image-preview') => {
      return await ai.models.generateContent({
        model: modelName,
        contents: [content],
        config: {
          responseModalities: ["IMAGE"],
          imageGenerationConfig: {
            aspectRatio: "16:9"
          }
        } as any
      });
    };

    let response;
    let fallbackUsed = false;
    let fallbackMessage = "";

    // Fallback chain: Nano Banana Pro → Nano Banana 2 → Nano Banana OG (GA)
    const models = [
      { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro' },
      { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2 (Flash)' },
      { id: 'gemini-2.5-flash-image', name: 'Nano Banana OG (Stable)' },
    ];

    const isServerError = (error: any): boolean => {
      const msg = error.message || "";
      const status = error.status || error.statusCode || error.code;
      return msg.includes("503") || msg.includes("UNAVAILABLE") || status === 503 || msg.includes("high demand")
        || msg.includes("500") || msg.includes("INTERNAL") || status === 500
        || msg.includes("502") || status === 502;
    };

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        console.log(`   Calling ${model.name} (${model.id})...`);
        response = await callWithPayload(primaryContent, model.id);
        if (i > 0) {
          fallbackUsed = true;
          fallbackMessage = `${models[0].name} was unavailable. Generated successfully with ${model.name}.`;
        }
        break; // Success — exit the loop
      } catch (error: any) {
        const msg = error.message || "";

        // On image processing errors with multi-image payload, retry same model with archetype only
        if (msg.includes("Unable to process input image") && imageParts.length > 1 && i === 0) {
          console.warn(`   ⚠️ Multi-image payload failed on ${model.name}. Retrying with Archetype ONLY...`);
          const fallbackContent = {
            role: 'user',
            parts: [
              { text: fullPrompt },
              { inlineData: imageParts[0].inlineData }
            ]
          };
          try {
            response = await callWithPayload(fallbackContent, model.id);
            break; // Success
          } catch (retryError: any) {
            if (!isServerError(retryError)) throw retryError;
            // If still a server error, continue to next model
          }
        }

        // If server error and there's a next model to try, continue the loop
        if (isServerError(error) && i < models.length - 1) {
          console.warn(`   ⚠️ ${model.name} returned server error. Trying next fallback...`);
          continue;
        }

        // Last model or non-server error — throw
        throw error;
      }
    }

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
      throw new Error("No candidates returned from Gemini API.");
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error("No parts in candidate from Gemini API.");
    }

    const part = candidate.content.parts.find((p: any) => p.inlineData && p.inlineData.data);
    if (!part || !part.inlineData || !part.inlineData.data) {
      throw new Error("No inlineData (image) found in response part.");
    }

    const base64Data = part.inlineData.data;
    const buffer = Buffer.from(base64Data, 'base64');

    console.log(`   ✓ Received image data: ${base64Data.length} chars (${(buffer.length / 1024).toFixed(1)}KB)`);

    return { buffer, fallbackUsed, fallbackMessage };
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
