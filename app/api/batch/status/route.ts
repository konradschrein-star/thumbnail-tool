import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
  }

  const userId = authResult.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const batchJobId = searchParams.get('batchJobId');

    if (!batchJobId) {
      return NextResponse.json(
        { error: 'Missing batchJobId parameter' },
        { status: 400 }
      );
    }

    // Fetch batch job with all associated generation jobs
    const batchJob = await prisma.batchJob.findUnique({
      where: { id: batchJobId },
      include: {
        jobs: {
          select: {
            id: true,
            status: true,
            outputUrl: true,
            errorMessage: true,
            videoTopic: true,
            thumbnailText: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!batchJob) {
      return NextResponse.json(
        { error: 'Batch job not found' },
        { status: 404 }
      );
    }

    // Verify authorization - user must own the batch job
    if (batchJob.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this batch job' },
        { status: 403 }
      );
    }

    // Calculate statistics
    const jobsByStatus = {
      pending: batchJob.jobs.filter((j) => j.status === 'pending').length,
      processing: batchJob.jobs.filter((j) => j.status === 'processing').length,
      completed: batchJob.jobs.filter((j) => j.status === 'completed').length,
      failed: batchJob.jobs.filter((j) => j.status === 'failed').length,
    };

    const progressPercentage = batchJob.totalJobs > 0
      ? Math.round(((batchJob.completedJobs + batchJob.failedJobs) / batchJob.totalJobs) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...batchJob,
        jobsByStatus,
        progressPercentage,
      },
    });
  } catch (error: any) {
    console.error('Batch status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch batch status' },
      { status: 500 }
    );
  }
}
