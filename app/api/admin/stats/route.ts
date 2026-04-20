/**
 * Admin API - System Statistics
 *
 * GET /api/admin/stats - Get system-wide statistics
 *
 * Returns:
 * - User counts (total, admins, active)
 * - Credit totals (granted, consumed, available)
 * - Job statistics (by status)
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
    // Fetch user statistics
    const [
      totalUsers,
      adminUsers,
      userCreditsAggregate,
      jobStats,
      recentTransactions,
    ] = await Promise.all([
      // Total user count
      prisma.user.count(),

      // Admin user count
      prisma.user.count({
        where: { role: 'ADMIN' },
      }),

      // Credit aggregates
      prisma.user.aggregate({
        _sum: {
          credits: true,
          totalCreditsGranted: true,
          totalCreditsConsumed: true,
        },
      }),

      // Job statistics by status
      prisma.generationJob.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      }),

      // Recent transactions (last 10)
      prisma.creditTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          transactionType: true,
          amount: true,
          reason: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Calculate users with credits
    const usersWithCredits = await prisma.user.count({
      where: { credits: { gt: 0 } },
    });

    // Transform job stats into a more readable format
    const jobStatsByStatus = jobStats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate active users (users who have generated at least one thumbnail)
    const activeUsers = await prisma.user.count({
      where: {
        generationJobs: {
          some: {},
        },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          admins: adminUsers,
          active: activeUsers,
          withCredits: usersWithCredits,
        },
        credits: {
          totalAvailable: userCreditsAggregate._sum.credits || 0,
          totalGranted: userCreditsAggregate._sum.totalCreditsGranted || 0,
          totalConsumed: userCreditsAggregate._sum.totalCreditsConsumed || 0,
        },
        jobs: {
          byStatus: jobStatsByStatus,
          total: Object.values(jobStatsByStatus).reduce(
            (sum, count) => sum + count,
            0
          ),
        },
        recentActivity: recentTransactions,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system statistics' },
      { status: 500 }
    );
  }
}
