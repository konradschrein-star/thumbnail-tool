import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';

export async function DELETE(request: NextRequest) {
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.user.id;
  const userRole = authResult.user.role || 'USER';

  try {
    const body = await request.json();
    const { jobIds } = body as { jobIds: string[] };

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'jobIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // For non-admins, verify ownership of all jobs
    if (userRole !== 'ADMIN') {
      const jobs = await prisma.generation_jobs.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, userId: true },
      });

      const unauthorizedJobs = jobs.filter(job => job.userId !== userId);

      if (unauthorizedJobs.length > 0) {
        return NextResponse.json(
          { error: `Forbidden: You do not own ${unauthorizedJobs.length} of the selected jobs` },
          { status: 403 }
        );
      }

      // Check if all requested jobs exist
      if (jobs.length !== jobIds.length) {
        return NextResponse.json(
          { error: 'Some jobs not found' },
          { status: 404 }
        );
      }
    }

    // Delete all jobs in one query
    const result = await prisma.generation_jobs.deleteMany({
      where: { id: { in: jobIds } },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete jobs' },
      { status: 500 }
    );
  }
}
