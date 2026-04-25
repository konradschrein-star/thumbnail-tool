/**
 * Batch Translation Endpoint
 * Translates all completed thumbnails from a batch to multiple target languages
 *
 * POST /api/batch/translate
 * Body: { batchJobId: string, targetLanguages: string[] }
 * Returns: { success: true, translationCount: number, languages: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import * as CreditService from '@/lib/credit-service';
import { getUserLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in first' },
        { status: 401 }
      );
    }

    const userId = session.user.id as string;
    const userRole = (session.user as any).role || 'USER';

    // Rate limiting: 20 batch translations per hour per user
    const limiter = getUserLimiter(userId, 20, 'hour');
    const remainingTokens = await limiter.removeTokens(1);

    if (remainingTokens < 0) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 20 batch translations per hour.',
          retryAfter: 3600
        },
        {
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600)
          }
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { batchJobId, targetLanguages } = body as {
      batchJobId: string;
      targetLanguages: string[];
    };

    if (!batchJobId) {
      return NextResponse.json(
        { error: 'Batch job ID is required' },
        { status: 400 }
      );
    }

    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return NextResponse.json(
        { error: 'At least one target language is required' },
        { status: 400 }
      );
    }

    // Verify batch exists and belongs to user
    const batchJob = await prisma.batch_jobs.findUnique({
      where: { id: batchJobId },
    });

    if (!batchJob) {
      return NextResponse.json(
        { error: 'Batch job not found' },
        { status: 404 }
      );
    }

    if (batchJob.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - batch belongs to another user' },
        { status: 403 }
      );
    }

    // Fetch all completed generation jobs from this batch
    const completedJobs = await prisma.generation_jobs.findMany({
      where: {
        batchJobId,
        status: 'completed',
        outputUrl: { not: null },
      },
      include: {
        channels: true,
        archetypes: true,
      },
    });

    if (completedJobs.length === 0) {
      return NextResponse.json(
        { error: 'No completed thumbnails found in this batch' },
        { status: 400 }
      );
    }

    console.log(`\n🌐 Translating batch ${batchJobId} (${completedJobs.length} thumbnails) to ${targetLanguages.length} languages`);

    // Calculate required credits
    const totalTranslations = completedJobs.length * targetLanguages.length;
    if (totalTranslations > 100) {
      console.warn(`⚠️  Large batch translation: ${totalTranslations} total translation jobs will be created`);
    }

    // Credit system: Non-admins must have sufficient credits
    const isAdmin = userRole === 'ADMIN';
    let creditsRemaining: number | null = null;

    if (!isAdmin) {
      try {
        const userCredits = await CreditService.getUserCredits(userId);
        if (userCredits < totalTranslations) {
          return NextResponse.json(
            {
              error: 'Insufficient credits',
              creditsRequired: totalTranslations,
              creditsAvailable: userCredits,
              message: `Creating ${targetLanguages.length} translation(s) for ${completedJobs.length} thumbnails requires ${totalTranslations} credits. You have ${userCredits}.`
            },
            { status: 402 }
          );
        }
      } catch (error) {
        console.error('Credit check failed:', error);
        return NextResponse.json(
          { error: 'Failed to check credit balance' },
          { status: 500 }
        );
      }
    }

    // Deduct credits upfront for non-admins
    if (!isAdmin) {
      try {
        creditsRemaining = await CreditService.deductCreditsForJob(
          userId,
          totalTranslations,
          `Deducted ${totalTranslations} credits for batch translation: ${targetLanguages.length} languages × ${completedJobs.length} thumbnails`,
          null
        );
        console.log(`✓ Deducted ${totalTranslations} credits (${creditsRemaining} remaining)`);
      } catch (error) {
        console.error('Credit deduction failed:', error);

        if (error instanceof CreditService.InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: 'Insufficient credits',
              creditsRequired: error.required,
              creditsAvailable: error.available,
              message: `Creating ${targetLanguages.length} translation(s) for ${completedJobs.length} thumbnails requires ${error.required} credits. You have ${error.available}.`
            },
            { status: 402 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        );
      }
    }

    // Create variant jobs for each completed job × each target language
    let translationCount = 0;

    for (const job of completedJobs) {
      for (const language of targetLanguages) {
        try {
          // Create variant job
          await prisma.variant_jobs.create({
            data: {
              id: require('crypto').randomUUID(),
              masterJobId: job.id,
              language,
              originalText: job.thumbnailText,
              translatedText: '', // Will be filled by worker
              translationMode: 'batch', // Mark as batch translation
              status: 'pending',
              metadata: {
                batchJobId,
                batchName: batchJob.name,
              } as any,
            },
          });

          translationCount++;
        } catch (createError) {
          console.error(`Failed to create variant job for ${job.id} (${language}): ${createError instanceof Error ? createError.message : String(createError)}`);
        }
      }
    }

    console.log(`✓ Created ${translationCount} translation jobs`);

    if (translationCount === 0) {
      return NextResponse.json(
        { error: 'Failed to create any translation jobs' },
        { status: 500 }
      );
    }

    const response: any = {
      success: true,
      translationCount,
      sourceJobCount: completedJobs.length,
      targetLanguages,
      message: `Queued ${translationCount} translation jobs (${completedJobs.length} thumbnails × ${targetLanguages.length} languages)`,
    };

    // Include credit info for non-admins
    if (!isAdmin && creditsRemaining !== null) {
      response.creditsRemaining = creditsRemaining;
      response.creditsDeducted = totalTranslations;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Batch translation error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Failed to create batch translations: ${errorMsg}` },
      { status: 500 }
    );
  }
}
