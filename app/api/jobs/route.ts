import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';
// GET /api/jobs?channelId=xxx&status=xxx - List generation jobs for the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await getApiAuth(request as any);
    if (authResult.error || !authResult.user?.id) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
    }

    const userId = authResult.user.id;
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const take = limit ? parseInt(limit) : undefined;

    // Build where clause
    const where: any = {
      userId: userId,
    };
    if (channelId) where.channelId = channelId;
    if (status) where.status = status;

    const jobs = await prisma.generation_jobs.findMany({
      where,
      include: {
        channels: {
          select: { id: true, name: true },
        },
        archetypes: {
          select: { id: true, name: true, imageUrl: true } as any,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take,
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Jobs fetch error:', error);

    // Sanitize Prisma connection errors for the frontend
    if (error.message?.includes("Can't reach database server")) {
      return NextResponse.json(
        { error: 'Database connection timeout. Please verify your Vercel Connection Pooler.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
