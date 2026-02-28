import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/jobs?channelId=xxx&status=xxx - List generation jobs for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const take = limit ? parseInt(limit) : undefined;

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };
    if (channelId) where.channelId = channelId;
    if (status) where.status = status;

    const jobs = await prisma.generationJob.findMany({
      where,
      include: {
        channel: {
          select: { id: true, name: true },
        },
        archetype: {
          select: { id: true, name: true, imageUrl: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take,
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
