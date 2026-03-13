import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';
import * as translationService from '@/lib/translation-service';
import * as payloadEngine from '@/lib/payload-engine';
import * as generationService from '@/lib/generation-service';
import * as r2Service from '@/lib/r2-service';

/**
 * POST /api/generate/translate
 *
 * Generates translated thumbnail variants from either:
 * 1. Master Job (existing completed generation)
 * 2. Uploaded Images (user-provided images)
 *
 * Request body:
 * {
 *   "masterJobId": "cm...",              // Option 1: Existing job
 *   "uploadedImages": ["/api/assets/..."], // Option 2: Uploaded images
 *   "originalText": "CLICK NOW",         // Required for uploaded images
 *   "targetLanguages": ["German", "Spanish", "Klingon"]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Generated 5/7 translations (2 failed)",
 *   "results": [...]
 * }
 */
export async function POST(request: NextRequest) {
  const authResult = await getApiAuth(request as any);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  try {
    const body = await request.json();
    const { masterJobId, uploadedImages, targetLanguages, originalText } = body;

    // Validation: targetLanguages is required
    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return NextResponse.json(
        { error: 'targetLanguages array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validation: must provide either masterJobId OR uploadedImages
    if (!masterJobId && !uploadedImages) {
      return NextResponse.json(
        { error: 'Either masterJobId or uploadedImages is required' },
        { status: 400 }
      );
    }

    if (masterJobId && uploadedImages) {
      return NextResponse.json(
        { error: 'Cannot specify both masterJobId and uploadedImages' },
        { status: 400 }
      );
    }

    // MODE 1: Translate from existing master job
    if (masterJobId) {
      return await handleMasterJobTranslation(
        masterJobId,
        targetLanguages,
        authResult
      );
    }

    // MODE 2: Translate from uploaded images
    if (uploadedImages) {
      return await handleUploadedImagesTranslation(
        uploadedImages,
        targetLanguages,
        originalText,
        authResult
      );
    }
  } catch (error: any) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Translation request failed' },
      { status: 500 }
    );
  }
}

/**
 * Mode 1: Translate an existing GenerationJob to multiple languages
 *
 * Process:
 * 1. Fetch master job with channel + archetype
 * 2. Translate thumbnailText to all target languages
 * 3. For each language:
 *    - Create VariantJob record
 *    - Build payload with translated text
 *    - Generate image via Nano Banana
 *    - Upload to R2
 *    - Update VariantJob with result
 * 4. Return summary
 */
async function handleMasterJobTranslation(
  masterJobId: string,
  targetLanguages: string[],
  authResult: any
) {
  console.log(`\n📝 Master Job Translation: ${masterJobId} → ${targetLanguages.length} languages`);

  // 1. Fetch master job
  const masterJob = await prisma.generationJob.findUnique({
    where: { id: masterJobId },
    include: { channel: true, archetype: true }
  });

  if (!masterJob) {
    return NextResponse.json(
      { error: 'Master job not found' },
      { status: 404 }
    );
  }

  console.log(`   Master job: "${masterJob.videoTopic}" | Text: "${masterJob.thumbnailText}"`);

  // 2. Translate thumbnail text to all target languages
  const translations = await translationService.batchTranslate(
    masterJob.thumbnailText,
    targetLanguages,
    process.env.GOOGLE_API_KEY!
  );

  // 3. Generate images for each translation
  const variantPromises = translations.map(async ({ language, translatedText, error: translationError }) => {
    console.log(`\n🌐 Processing ${language}...`);

    try {
      // Create VariantJob record
      const variant = await (prisma as any).variantJob.create({
        data: {
          masterJobId: masterJob.id,
          language,
          translatedText,
          originalText: masterJob.thumbnailText,
          translationMode: 'MASTER_JOB',
          status: translationError ? 'failed' : 'processing',
          errorMessage: translationError
        }
      });

      // If translation failed, mark as failed and return
      if (translationError) {
        console.log(`   ✗ Translation failed: ${translationError}`);
        return { variant, status: 'failed', error: translationError };
      }

      // Build payload with TRANSLATED text
      const payload = {
        systemPrompt: "You are an expert AI image generator fine-tuned for high-CTR YouTube thumbnails.",
        userPrompt: payloadEngine.buildFullPrompt(
          masterJob.channel,
          masterJob.archetype,
          {
            videoTopic: masterJob.videoTopic,
            thumbnailText: translatedText, // Use translated text!
            customPrompt: undefined
          },
          true, // includeBrandColors
          !!masterJob.channel.personaAssetPath // includePersona
        ),
        base64Images: {
          archetype: await payloadEngine.encodeImageToBase64(masterJob.archetype.imageUrl)
        } as any
      };

      // Add persona image if available
      if (masterJob.channel.personaAssetPath) {
        const personaImage = await payloadEngine.encodeImageToBase64(masterJob.channel.personaAssetPath);
        if (personaImage && personaImage.data) {
          payload.base64Images.persona = personaImage;
        }
      }

      // Add logo image if available
      if (masterJob.channel.logoAssetPath) {
        const logoImage = await payloadEngine.encodeImageToBase64(masterJob.channel.logoAssetPath);
        if (logoImage && logoImage.data) {
          payload.base64Images.logo = logoImage;
        }
      }

      console.log(`   🎨 Generating image with NB2...`);

      // Generate image
      const { buffer: imageBuffer } = await generationService.callNanoBanana(
        payload,
        process.env.GOOGLE_API_KEY!
      );

      // Upload to R2
      const filename = `variant_${variant.id}.png`;
      const outputUrl = await r2Service.uploadToR2(
        imageBuffer,
        filename,
        'image/png',
        authResult.user.email || 'system'
      );

      console.log(`   ✓ Uploaded to: ${outputUrl}`);

      // Update variant job
      const updatedVariant = await (prisma as any).variantJob.update({
        where: { id: variant.id },
        data: {
          status: 'completed',
          outputUrl,
          completedAt: new Date()
        }
      });

      return { variant: updatedVariant, status: 'completed' };
    } catch (generationError: any) {
      console.error(`   ✗ Generation failed for ${language}:`, generationError.message);

      // Try to update variant with error (may fail if variant wasn't created)
      try {
        const variant = await (prisma as any).variantJob.findFirst({
          where: { masterJobId, language },
          orderBy: { createdAt: 'desc' }
        });

        if (variant) {
          await (prisma as any).variantJob.update({
            where: { id: variant.id },
            data: {
              status: 'failed',
              errorMessage: generationError.message || 'Image generation failed'
            }
          });

          return { variant, status: 'failed', error: generationError.message };
        }
      } catch (dbError) {
        console.error('Failed to update variant with error:', dbError);
      }

      return { status: 'failed', error: generationError.message, language };
    }
  });

  // Wait for all translations to complete
  const results = await Promise.allSettled(variantPromises);

  // Count successes and failures
  const successCount = results.filter(
    r => r.status === 'fulfilled' && r.value.status === 'completed'
  ).length;
  const failedCount = results.length - successCount;

  console.log(`\n✅ Translation complete: ${successCount} succeeded, ${failedCount} failed`);

  return NextResponse.json({
    success: true,
    message: `Generated ${successCount}/${results.length} translations${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'failed', error: 'Promise rejected' })
  });
}

/**
 * Mode 2: Translate uploaded images to multiple languages
 *
 * Process:
 * 1. Validate uploaded images are accessible
 * 2. Translate originalText to all target languages
 * 3. For each image × language combination:
 *    - Create VariantJob record
 *    - Build payload: "Recreate image with translated text"
 *    - Generate image via Nano Banana
 *    - Upload to R2
 *    - Update VariantJob
 * 4. Return summary
 */
async function handleUploadedImagesTranslation(
  uploadedImages: string[],
  targetLanguages: string[],
  originalText: string,
  authResult: any
) {
  console.log(`\n📤 Uploaded Images Translation: ${uploadedImages.length} images → ${targetLanguages.length} languages`);

  // Validation: originalText is required for uploaded images
  if (!originalText || originalText.trim().length === 0) {
    return NextResponse.json(
      { error: 'originalText is required when translating uploaded images' },
      { status: 400 }
    );
  }

  // Validation: uploadedImages must be an array
  if (!Array.isArray(uploadedImages) || uploadedImages.length === 0) {
    return NextResponse.json(
      { error: 'uploadedImages must be a non-empty array' },
      { status: 400 }
    );
  }

  // Validation: all uploaded images must be valid asset URLs
  for (const imageUrl of uploadedImages) {
    if (!imageUrl.startsWith('/api/assets/')) {
      return NextResponse.json(
        { error: `Invalid image URL format: ${imageUrl}. Must be /api/assets/...` },
        { status: 400 }
      );
    }
  }

  console.log(`   Original text: "${originalText}"`);

  // Translate text to all target languages
  const translations = await translationService.batchTranslate(
    originalText,
    targetLanguages,
    process.env.GOOGLE_API_KEY!
  );

  const allResults = [];

  // For each uploaded image, generate translated versions
  for (let imgIndex = 0; imgIndex < uploadedImages.length; imgIndex++) {
    const imageUrl = uploadedImages[imgIndex];
    console.log(`\n🖼️ Processing image ${imgIndex + 1}/${uploadedImages.length}: ${imageUrl}`);

    const imageResults = await Promise.allSettled(
      translations.map(async ({ language, translatedText, error: translationError }) => {
        console.log(`\n  🌐 ${language}...`);

        try {
          // Create VariantJob (no masterJobId for uploaded images)
          const variant = await (prisma as any).variantJob.create({
            data: {
              masterJobId: null,
              sourceImageUrl: imageUrl,
              language,
              translatedText,
              originalText,
              translationMode: 'UPLOADED_IMAGE',
              status: translationError ? 'failed' : 'processing',
              errorMessage: translationError
            }
          });

          if (translationError) {
            console.log(`     ✗ Translation failed: ${translationError}`);
            return { variant, status: 'failed', error: translationError };
          }

          // Build payload: recreate image with translated text
          const payload = {
            systemPrompt: "You are an expert AI image generator specialized in thumbnail localization.",
            userPrompt: `Recreate this thumbnail image EXACTLY as shown, but replace any text with: "${translatedText}"

CRITICAL INSTRUCTIONS:
- Maintain the EXACT same style, layout, colors, composition, and visual design
- Keep all visual elements (graphics, photos, effects) identical
- ONLY change the text content to the translated version
- Preserve text styling (font style, color, effects, placement)
- Match the formatting (ALL CAPS, Title Case, etc.)
- Maintain the same energy and visual impact

If there is NO text in the original image, recreate it exactly without adding any text.`,
            base64Images: {
              archetype: await payloadEngine.encodeImageToBase64(imageUrl)
            }
          };

          console.log(`     🎨 Generating with NB2...`);

          // Generate image
          const { buffer: imageBuffer } = await generationService.callNanoBanana(
            payload,
            process.env.GOOGLE_API_KEY!
          );

          // Upload to R2
          const filename = `translated_${variant.id}.png`;
          const outputUrl = await r2Service.uploadToR2(
            imageBuffer,
            filename,
            'image/png',
            authResult.user.email || 'system'
          );

          console.log(`     ✓ Uploaded to: ${outputUrl}`);

          // Update variant
          const updatedVariant = await (prisma as any).variantJob.update({
            where: { id: variant.id },
            data: {
              status: 'completed',
              outputUrl,
              completedAt: new Date()
            }
          });

          return { variant: updatedVariant, status: 'completed' };
        } catch (generationError: any) {
          console.error(`     ✗ Generation failed:`, generationError.message);

          // Update variant with error
          try {
            const variant = await (prisma as any).variantJob.findFirst({
              where: { sourceImageUrl: imageUrl, language },
              orderBy: { createdAt: 'desc' }
            });

            if (variant) {
              await (prisma as any).variantJob.update({
                where: { id: variant.id },
                data: {
                  status: 'failed',
                  errorMessage: generationError.message || 'Image generation failed'
                }
              });

              return { variant, status: 'failed', error: generationError.message };
            }
          } catch (dbError) {
            console.error('Failed to update variant with error:', dbError);
          }

          return { status: 'failed', error: generationError.message, language };
        }
      })
    );

    allResults.push(...imageResults);
  }

  // Count successes and failures
  const successCount = allResults.filter(
    r => r.status === 'fulfilled' && r.value.status === 'completed'
  ).length;
  const failedCount = allResults.length - successCount;

  console.log(`\n✅ Upload translation complete: ${successCount} succeeded, ${failedCount} failed`);

  return NextResponse.json({
    success: true,
    message: `Generated ${successCount}/${allResults.length} translations${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
    totalImages: uploadedImages.length,
    totalLanguages: targetLanguages.length,
    totalGenerated: successCount,
    totalFailed: failedCount,
    results: allResults.map(r => r.status === 'fulfilled' ? r.value : { status: 'failed', error: 'Promise rejected' })
  });
}
