import { GoogleGenAI } from '@google/genai';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Structured error information from Google API calls
 */
export interface GoogleAPIError {
  statusCode?: number;
  message: string;
  rawResponse?: unknown;
}

/**
 * Google Gemini image generation request with URL-based references
 */
export interface GoogleImageGenerationRequest {
  prompt: string;
  referenceImageUrl?: string; // URL or local path to archetype reference image
  personaImageUrl?: string;   // URL or local path to persona reference (optional)
  logoImageUrl?: string;      // URL or local path to logo (optional)
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
 * Converts a local file path or URL to inline base64 data
 * @param pathOrUrl - Local file path (e.g., /archetypes/image.jpg, public/archetypes/image.jpg) or HTTPS URL
 * @returns Inline data object for Google API or fileData object for URLs
 */
function convertToImagePart(pathOrUrl: string): { inlineData?: { mimeType: string; data: string }; fileData?: { mimeType: string; fileUri: string } } {
  // If it's an HTTPS URL or Google File API URL, return as fileData
  if (pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('http://')) {
    const ext = pathOrUrl.split('.').pop()?.toLowerCase() || 'jpg';
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';

    return {
      fileData: {
        mimeType,
        fileUri: pathOrUrl
      }
    };
  }

  // Otherwise, treat as local path and convert to inline base64
  let filePath = pathOrUrl;

  // Handle both absolute and relative paths
  if (!existsSync(filePath)) {
    // Try relative to process.cwd()/public
    const publicPath = join(process.cwd(), 'public', filePath.startsWith('/') ? filePath.substring(1) : filePath);
    if (existsSync(publicPath)) {
      filePath = publicPath;
    } else {
      // Try relative to process.cwd()
      const cwdPath = join(process.cwd(), filePath.startsWith('/') ? filePath.substring(1) : filePath);
      if (existsSync(cwdPath)) {
        filePath = cwdPath;
      } else {
        throw new Error(`File not found: ${pathOrUrl} (tried ${publicPath} and ${cwdPath})`);
      }
    }
  }

  const fileBuffer = readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
  let mimeType = 'image/jpeg';
  if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'webp') mimeType = 'image/webp';

  return {
    inlineData: {
      mimeType,
      data: base64Data
    }
  };
}

/**
 * Calls the Nano Banana (gemini-3-pro-image-preview) model to generate a thumbnail image
 *
 * Nano Banana is a multimodal Gemini model that supports multi-image fusion and character consistency.
 * It uses generateContent (not generateImages) with responseModalities: ["IMAGE"].
 *
 * Uses URL-based image references instead of base64 encoding for faster processing.
 *
 * @param request - Generation request with prompt and optional image URLs
 * @param apiKey - Google API key
 * @returns Image buffer containing the generated thumbnail
 * @throws Error with structured information if API call fails
 */
export async function callNanoBanana(
  request: GoogleImageGenerationRequest,
  apiKey: string
): Promise<{ buffer: Buffer; fallbackUsed: boolean; fallbackMessage?: string }> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const imageParts: Array<{ inlineData?: { mimeType: string; data: string }; fileData?: { mimeType: string; fileUri: string } }> = [];

    // Convert reference images (URLs or local paths) to appropriate format
    if (request.referenceImageUrl) {
      imageParts.push(convertToImagePart(request.referenceImageUrl));
    }
    if (request.personaImageUrl) {
      imageParts.push(convertToImagePart(request.personaImageUrl));
    }
    if (request.logoImageUrl) {
      imageParts.push(convertToImagePart(request.logoImageUrl));
    }

    // Unified multi-part content (RELEVANT: Gemini preview models often fail if parts are split across messages)
    const primaryContent = {
      role: 'user',
      parts: [
        { text: request.prompt },
        ...imageParts.map(p => p.inlineData ? { inlineData: p.inlineData } : { fileData: p.fileData! })
      ]
    };

    const callWithPayload = async (content: any, modelName: string = 'gemini-3-pro-image-preview') => {
      return await ai.models.generateContent({
        model: modelName,
        contents: [content],
        config: {
          responseModalities: ["IMAGE"],
          imageGenerationConfig: {
            aspectRatio: "16:9",
            resolution: "1K" // Options: "512", "1K", "2K", "4K"
          }
        } as any
      });
    };

    let response;
    let fallbackUsed = false;
    let fallbackMessage = "";

    // Fallback chain: Nano Banana 2 → Nano Banana Pro → Nano Banana OG (GA)
    // NB2 is PRIMARY for 50% cost savings ($0.0672 vs $0.134 per image)
    const models = [
      { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2 (Flash)' },
      { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro' },
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
          const firstImagePart = imageParts[0].inlineData
            ? { inlineData: imageParts[0].inlineData }
            : { fileData: imageParts[0].fileData! };
          const fallbackContent = {
            role: 'user',
            parts: [
              { text: request.prompt },
              firstImagePart
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

    if (!response) {
      throw new Error("No response received from Gemini API.");
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
