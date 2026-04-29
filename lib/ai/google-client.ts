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
  resolution?: '512' | '1K' | '2K';
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
 * Parses Google API errors and returns user-friendly messages
 */
function parseGoogleAPIError(error: any): { code: number; userMessage: string; originalError: any } {
  const msg = error.message || String(error);
  const status = error.status || error.statusCode || error.code;

  // 400 INVALID_ARGUMENT
  if (status === 400 || msg.includes('INVALID_ARGUMENT')) {
    return {
      code: 400,
      userMessage: 'Invalid request format. Please check your prompt and image inputs.',
      originalError: error
    };
  }

  // 403 PERMISSION_DENIED
  if (status === 403 || msg.includes('PERMISSION_DENIED') || msg.includes('API key')) {
    return {
      code: 403,
      userMessage: 'API key permission denied. Please check your Google API key configuration.',
      originalError: error
    };
  }

  // 404 NOT_FOUND
  if (status === 404 || msg.includes('NOT_FOUND')) {
    return {
      code: 404,
      userMessage: 'Resource not found. One of your reference images may be missing.',
      originalError: error
    };
  }

  // 429 RESOURCE_EXHAUSTED (Rate limit)
  if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return {
      code: 429,
      userMessage: 'Rate limit exceeded. Too many requests to the Gemini API. Please wait a moment and try again.',
      originalError: error
    };
  }

  // 500 INTERNAL (Google server error)
  if (status === 500 || msg.includes('INTERNAL') || msg.includes('500')) {
    return {
      code: 500,
      userMessage: 'Google API internal error. This is a temporary issue on Google\'s side. Please try again in a few moments.',
      originalError: error
    };
  }

  // 503 UNAVAILABLE (High traffic / overloaded)
  if (status === 503 || msg.includes('UNAVAILABLE') || msg.includes('503') || msg.includes('high demand')) {
    return {
      code: 503,
      userMessage: 'Gemini API is experiencing high traffic and is temporarily unavailable. Please try again in a few minutes.',
      originalError: error
    };
  }

  // 504 DEADLINE_EXCEEDED (Timeout)
  if (status === 504 || msg.includes('DEADLINE_EXCEEDED') || msg.includes('timeout')) {
    return {
      code: 504,
      userMessage: 'Request timeout. Your prompt may be too complex or the API is slow. Try simplifying your request.',
      originalError: error
    };
  }

  // Safety/Content policy errors
  if (msg.includes('safety') || msg.includes('blocked') || msg.includes('BLOCKED_REASON') || msg.includes('SAFETY')) {
    return {
      code: 400,
      userMessage: 'Content blocked by safety filters. Your prompt or images may violate Google\'s content policies.',
      originalError: error
    };
  }

  // Default unknown error
  return {
    code: 500,
    userMessage: `Gemini API error: ${msg}`,
    originalError: error
  };
}

/**
 * Calls the Nano Banana (gemini-3.1-flash-image-preview) model to generate a thumbnail image
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
): Promise<{ buffer: Buffer }> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const imageParts: Array<{ inlineData?: { mimeType: string; data: string }; fileData?: { mimeType: string; fileUri: string } }> = [];

    // DEBUG: Log what reference images we're using
    console.log('   📎 Reference images:');
    if (request.referenceImageUrl) {
      console.log(`      - Archetype: ${request.referenceImageUrl}`);
    }
    if (request.personaImageUrl) {
      console.log(`      - Persona: ${request.personaImageUrl}`);
    }
    if (request.logoImageUrl) {
      console.log(`      - Logo: ${request.logoImageUrl}`);
    }

    // Convert reference images (URLs or local paths) to appropriate format
    if (request.referenceImageUrl) {
      const part = convertToImagePart(request.referenceImageUrl);
      console.log(`      ✓ Archetype loaded: ${part.inlineData ? `${(part.inlineData.data.length / 1024).toFixed(1)}KB base64` : 'URL reference'}`);
      imageParts.push(part);
    }
    if (request.personaImageUrl) {
      imageParts.push(convertToImagePart(request.personaImageUrl));
    }
    if (request.logoImageUrl) {
      imageParts.push(convertToImagePart(request.logoImageUrl));
    }

    // DEBUG: Log prompt
    console.log(`   📝 Prompt: ${request.prompt.substring(0, 150)}...`);
    console.log(`   🖼️  Total image parts attached: ${imageParts.length}`);

    // Unified multi-part content (RELEVANT: Gemini preview models often fail if parts are split across messages)
    const primaryContent = {
      role: 'user',
      parts: [
        { text: request.prompt },
        ...imageParts.map(p => p.inlineData ? { inlineData: p.inlineData } : { fileData: p.fileData! })
      ]
    };

    const callWithPayload = async (content: any, modelName: string = 'gemini-3.1-flash-image-preview') => {
      const config: any = {
        responseModalities: ["IMAGE"],
        imageGenerationConfig: {
          aspectRatio: "16:9",
          resolution: request.resolution || "1K" // Options: "512", "1K", "2K", "4K"
        }
      };

      // For Flash model, use minimal thinking for lowest latency
      if (modelName === 'gemini-3.1-flash-image-preview') {
        config.thinkingConfig = {
          thinkingLevel: "minimal",
          includeThoughts: false
        };
      }

      return await ai.models.generateContent({
        model: modelName,
        contents: [content],
        config
      });
    };

    // Use only Flash model with minimal thinking - no fallbacks
    const modelId = 'gemini-3.1-flash-image-preview';
    const modelName = 'Gemini 3.1 Flash Image';

    let response;
    const startTime = Date.now();

    try {
      console.log(`   ⏱️  Calling ${modelName}...`);
      response = await callWithPayload(primaryContent, modelId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`   ✅ ${modelName} completed in ${duration}s`);
    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`   ❌ ${modelName} failed after ${duration}s`);

      // Parse and throw proper error
      const apiError = parseGoogleAPIError(error);
      throw new Error(apiError.userMessage);
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

    return { buffer };
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
