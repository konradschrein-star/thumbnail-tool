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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status'); // Filter by status (PENDING, PROCESSING, COMPLETED, FAILED, PARTIAL)
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // Sort field
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // Sort order

    // Build filter
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    // Fetch batch jobs
    const batchJobs = await prisma.batch_jobs.findMany({
      where,
      include: {
        generation_jobs: {
          select: {
            id: true,
            status: true,
            outputUrl: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await prisma.batch_jobs.count({ where });

    return NextResponse.json({
      success: true,
      data: batchJobs,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error: any) {
    console.error('Batch list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list batch jobs' },
      { status: 500 }
    );
  }
}
