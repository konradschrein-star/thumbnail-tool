import { GoogleGenAI } from '@google/genai';

/**
 * Translation result for a single language
 */
export interface TranslationResult {
  language: string;
  translatedText: string;
  error?: string;
}

/**
 * Translates text to a target language using Gemini API
 *
 * Uses gemini-2.5-flash for cost-effective text-only translation.
 * Supports fictional languages (Klingon, Elvish, etc.) via creative prompting.
 *
 * @param text - Text to translate
 * @param targetLanguage - Target language (e.g., "German", "Klingon")
 * @param apiKey - Google API key
 * @returns Translated text
 * @throws Error if translation fails
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  apiKey: string
): Promise<string> {
  if (!text || !targetLanguage || !apiKey) {
    throw new Error('Missing required parameters for translation');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Translate the following text to ${targetLanguage}.

CRITICAL INSTRUCTIONS:
- Preserve the original style, tone, and formatting (ALL CAPS, Title Case, etc.)
- For real languages: Provide accurate, natural translation
- For fictional languages (Klingon, Elvish, Na'vi, etc.): Create an authentic-sounding translation that matches the language's known characteristics and conventions
- Maintain the same energy and impact as the original
- Keep it concise and punchy (thumbnail text should be brief)
- Respond ONLY with the translated text - NO explanations, NO quotation marks, NO additional commentary

Original text: "${text}"

Translated text:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const candidate = response.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error('Missing or empty translation content from Gemini');
    }

    const translatedText = textPart.trim();

    // Remove any quotation marks that Gemini might add
    return translatedText.replace(/^["']|["']$/g, '');
  } catch (error: any) {
    console.error(`Translation error for ${targetLanguage}:`, error);
    throw new Error(`Failed to translate to ${targetLanguage}: ${error.message || error}`);
  }
}

/**
 * Translates text to multiple target languages in parallel
 *
 * Uses Promise.allSettled() for partial failure tolerance.
 * If a translation fails, the original text is used as fallback.
 *
 * @param text - Text to translate
 * @param languages - Array of target languages
 * @param apiKey - Google API key
 * @returns Array of translation results (some may have errors)
 */
export async function batchTranslate(
  text: string,
  languages: string[],
  apiKey: string
): Promise<TranslationResult[]> {
  if (!text || !languages || languages.length === 0) {
    throw new Error('Text and languages array are required for batch translation');
  }

  console.log(`Batch translating "${text}" to ${languages.length} languages...`);

  // Translate to all languages in parallel
  const translationPromises = languages.map(async (language) => {
    try {
      const translatedText = await translateText(text, language, apiKey);
      console.log(`  ✓ ${language}: "${translatedText}"`);
      return { language, translatedText };
    } catch (error: any) {
      console.warn(`  ✗ ${language}: ${error.message}`);
      // Return original text as fallback
      return {
        language,
        translatedText: text,
        error: error.message || 'Translation failed'
      };
    }
  });

  const results = await Promise.allSettled(translationPromises);

  // Convert PromiseSettledResult to TranslationResult
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // Fallback if promise itself rejected
      return {
        language: languages[index],
        translatedText: text,
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}

/**
 * Validates that a translation result is acceptable
 *
 * Checks for common translation failures like:
 * - Empty translations
 * - Translations that are too long (likely errors)
 * - Translations that look like error messages
 *
 * @param result - Translation result to validate
 * @param originalText - Original text for comparison
 * @returns True if translation is valid
 */
export function isValidTranslation(
  result: TranslationResult,
  originalText: string
): boolean {
  // Has error flag
  if (result.error) {
    return false;
  }

  // Empty or whitespace only
  if (!result.translatedText || result.translatedText.trim().length === 0) {
    return false;
  }

  // Suspiciously long (likely an error message)
  if (result.translatedText.length > originalText.length * 3) {
    return false;
  }

  // Looks like an error message
  const errorPatterns = [
    /error/i,
    /failed/i,
    /cannot translate/i,
    /unable to/i,
    /sorry/i,
    /i don't/i,
    /i cannot/i
  ];

  for (const pattern of errorPatterns) {
    if (pattern.test(result.translatedText)) {
      return false;
    }
  }

  return true;
}
