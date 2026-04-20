import { NextRequest, NextResponse } from 'next/server';
import { thumbnailQueue } from '@/lib/queue/thumbnail-queue';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
  }

  try {
    // Get queue counts
    const jobCounts = await thumbnailQueue.getJobCounts();
    const activeJobs = await thumbnailQueue.getActiveCount();
    const pausedJobs = await thumbnailQueue.getPausedCount();
    const waitingJobs = await thumbnailQueue.getWaitingCount();
    const completedJobs = await thumbnailQueue.getCompletedCount();
    const failedJobs = await thumbnailQueue.getFailedCount();
    const delayedJobs = await thumbnailQueue.getDelayedCount();

    // Get database stats
    const totalGenerationJobs = await prisma.generationJob.count();
    const completedGenerationJobs = await prisma.generationJob.count({
      where: { status: 'completed' },
    });
    const failedGenerationJobs = await prisma.generationJob.count({
      where: { status: 'failed' },
    });
    const processingGenerationJobs = await prisma.generationJob.count({
      where: { status: 'processing' },
    });

    // Get batch stats
    const activeBatches = await prisma.batchJob.count({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
    });
    const completedBatches = await prisma.batchJob.count({
      where: { status: 'COMPLETED' },
    });
    const failedBatches = await prisma.batchJob.count({
      where: { status: 'FAILED' },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      queue: {
        active: activeJobs,
        paused: pausedJobs,
        waiting: waitingJobs,
        completed: completedJobs,
        failed: failedJobs,
        delayed: delayedJobs,
      },
      generationJobs: {
        total: totalGenerationJobs,
        completed: completedGenerationJobs,
        failed: failedGenerationJobs,
        processing: processingGenerationJobs,
        pending: totalGenerationJobs - completedGenerationJobs - failedGenerationJobs - processingGenerationJobs,
      },
      batchJobs: {
        active: activeBatches,
        completed: completedBatches,
        failed: failedBatches,
      },
    });
  } catch (error: any) {
    console.error('Queue stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queue stats' },
      { status: 500 }
    );
  }
}
