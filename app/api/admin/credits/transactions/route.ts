/**
 * Admin API - Credit Transactions
 *
 * GET /api/admin/credits/transactions - View credit transaction audit log
 *
 * Query params:
 * - userId: string (optional - filter by specific user)
 * - limit: number (default: 50, max: 200)
 * - offset: number (default: 0)
 * - type: string (optional - filter by transaction type: grant, deduct, refund)
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
    const userId = searchParams.get('userId');
    const typeFilter = searchParams.get('type');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      200 // Max 200 transactions per request
    );
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (typeFilter && ['grant', 'deduct', 'refund'].includes(typeFilter)) {
      where.transactionType = typeFilter;
    }

    // Fetch transactions with user info
    const [transactions, totalCount] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        select: {
          id: true,
          userId: true,
          transactionType: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          reason: true,
          relatedJobId: true,
          relatedBatchId: true,
          adminUserId: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.creditTransaction.count({ where }),
    ]);

    // Fetch admin user info for grant transactions
    const adminUserIds = [
      ...new Set(
        transactions
          .filter((t) => t.adminUserId)
          .map((t) => t.adminUserId as string)
      ),
    ];

    const adminUsers = await prisma.user.findMany({
      where: { id: { in: adminUserIds } },
      select: { id: true, email: true, name: true },
    });

    const adminUserMap = new Map(
      adminUsers.map((u) => [u.id, { email: u.email, name: u.name }])
    );

    // Enrich transactions with admin user info
    const enrichedTransactions = transactions.map((t) => ({
      ...t,
      adminUser: t.adminUserId ? adminUserMap.get(t.adminUserId) : null,
    }));

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
