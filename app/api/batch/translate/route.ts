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

    // Warn if large batch
    const totalTranslations = completedJobs.length * targetLanguages.length;
    if (totalTranslations > 100) {
      console.warn(`⚠️  Large batch translation: ${totalTranslations} total translation jobs will be created`);
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

    return NextResponse.json({
      success: true,
      translationCount,
      sourceJobCount: completedJobs.length,
      targetLanguages,
      message: `Queued ${translationCount} translation jobs (${completedJobs.length} thumbnails × ${targetLanguages.length} languages)`,
    });
  } catch (error) {
    console.error('Batch translation error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Failed to create batch translations: ${errorMsg}` },
      { status: 500 }
    );
  }
}
