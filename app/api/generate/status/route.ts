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
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    // Fetch the generation job
    const job = await prisma.generation_jobs.findUnique({
      where: { id: jobId },
      include: {
        channel: {
          select: { id: true, name: true },
        },
        archetype: {
          select: { id: true, name: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Verify authorization - user must own the job
    if (job.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this job' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        videoTopic: job.videoTopic,
        thumbnailText: job.thumbnailText,
        outputUrl: job.outputUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        channel: job.channel,
        archetype: job.archetype,
        isManual: job.isManual,
      },
    });
  } catch (error: any) {
    console.error('Generate status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
