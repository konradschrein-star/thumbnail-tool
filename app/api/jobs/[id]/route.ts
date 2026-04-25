import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.user.id;
  const userRole = authResult.user.role || 'USER';
  const jobId = params.id;

  try {
    const job = await prisma.generation_jobs.findUnique({
      where: { id: jobId },
      include: {
        channel: true,
        archetype: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check ownership (admin can view all jobs)
    if (userRole !== 'ADMIN' && job.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.user.id;
  const userRole = authResult.user.role || 'USER';
  const jobId = params.id;

  try {
    // Check if job exists and user owns it
    const job = await prisma.generation_jobs.findUnique({
      where: { id: jobId },
      select: { id: true, userId: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check ownership (admin can delete all jobs)
    if (userRole !== 'ADMIN' && job.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this job' }, { status: 403 });
    }

    // Delete the job (cascading will handle related variant_jobs)
    await prisma.generation_jobs.delete({
      where: { id: jobId },
    });

    return NextResponse.json({
      success: true,
      deletedCount: 1,
    });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
