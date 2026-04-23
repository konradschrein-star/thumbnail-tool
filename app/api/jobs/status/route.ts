/**
 * Job Status Polling Endpoint
 * Returns current status for multiple jobs (used for real-time updates)
 *
 * GET /api/jobs/status?jobIds=id1,id2,id3
 * Returns: { jobs: Array<{ id, status, outputUrl, thumbnailUrl, progress }> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const MAX_JOB_IDS = 50; // Limit batch size to prevent abuse

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get job IDs from query params
    const { searchParams } = new URL(request.url);
    const jobIdsParam = searchParams.get('jobIds');

    if (!jobIdsParam) {
      return NextResponse.json(
        { error: 'jobIds parameter is required' },
        { status: 400 }
      );
    }

    // Parse comma-separated job IDs
    const jobIds = jobIdsParam.split(',').map((id) => id.trim()).filter((id) => id);

    if (jobIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid job IDs provided' },
        { status: 400 }
      );
    }

    if (jobIds.length > MAX_JOB_IDS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_JOB_IDS} job IDs allowed per request` },
        { status: 400 }
      );
    }

    // Fetch jobs (verify they belong to user)
    const jobs = await prisma.generation_jobs.findMany({
      where: {
        id: { in: jobIds },
        userId,
      },
      select: {
        id: true,
        status: true,
        outputUrl: true,
        errorMessage: true,
        completedAt: true,
        metadata: true,
      },
    });

    // Map to response format
    const jobStatuses = jobs.map((job) => ({
      id: job.id,
      status: job.status,
      outputUrl: job.outputUrl,
      thumbnailUrl: job.outputUrl, // Same as outputUrl for now
      errorMessage: job.errorMessage,
      completedAt: job.completedAt?.toISOString() || null,
      // Calculate progress estimate (not exact, just for UI)
      progress:
        job.status === 'completed'
          ? 100
          : job.status === 'processing'
          ? 50
          : job.status === 'pending'
          ? 0
          : 0,
    }));

    return NextResponse.json({ jobs: jobStatuses });
  } catch (error) {
    console.error('Job status fetch error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Failed to fetch job status: ${errorMsg}` },
      { status: 500 }
    );
  }
}
