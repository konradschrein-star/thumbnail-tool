/**
 * Admin API - Jobs Monitoring
 *
 * GET /api/admin/jobs - List all generation jobs across all users
 *
 * Query params:
 * - limit: number (default: 50, max: 200)
 * - offset: number (default: 0)
 * - status: string (filter by status: completed, failed, processing)
 * - userId: string (filter by specific user)
 * - channelId: string (filter by specific channel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';
import { getUserLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  // Check authentication and admin role
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  // Rate limiting: 10 admin requests per minute per admin user
  const limiter = getUserLimiter(`admin:${authResult.user.id}`, 10, 'minute');
  const remainingTokens = await limiter.removeTokens(1);

  if (remainingTokens < 0) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 10 admin requests per minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const userRole = authResult.user.role || 'USER';

  // Admin-only endpoint
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden. Admin access required.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const statusFilter = searchParams.get('status');
    const userIdFilter = searchParams.get('userId');
    const channelIdFilter = searchParams.get('channelId');

    // Build where clause
    const where: any = {};
    if (statusFilter) where.status = statusFilter;
    if (userIdFilter) where.userId = userIdFilter;
    if (channelIdFilter) where.channelId = channelIdFilter;

    // Fetch jobs with user, channel, and archetype info
    const [jobs, totalCount] = await Promise.all([
      prisma.generationJob.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          channel: {
            select: {
              id: true,
              name: true,
            },
          },
          archetype: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.generationJob.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Admin jobs API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
