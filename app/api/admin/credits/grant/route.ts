/**
 * Admin API - Grant or Deduct Credits
 *
 * POST /api/admin/credits/grant - Grant or deduct credits from a user
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "amount": 100,  // positive to grant, negative to deduct
 *   "reason": "Monthly subscription"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';
import * as CreditService from '@/lib/credit-service';
import { getUserLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
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

  const adminUserId = authResult.user.id;
  const userRole = authResult.user.role || 'USER';

  // Admin-only endpoint
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden. Admin access required.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, amount, reason } = body;

    // Validation
    if (!email || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: email, amount, reason' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json(
        { error: 'Amount must be a non-zero number' },
        { status: 400 }
      );
    }

    if (Math.abs(amount) > 10000) {
      return NextResponse.json(
        { error: 'Amount too large. Maximum 10,000 credits per operation.' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${email}` },
        { status: 404 }
      );
    }

    // Grant or deduct credits using the credit service
    let newBalance: number;

    if (amount > 0) {
      // Grant credits
      newBalance = await CreditService.grantCredits(
        user.id,
        amount,
        adminUserId,
        reason
      );
    } else {
      // Deduct credits (amount is negative)
      const deductAmount = Math.abs(amount);

      // Check if user has enough credits
      if (user.credits < deductAmount) {
        return NextResponse.json(
          { error: `Insufficient credits. User has ${user.credits}, attempting to deduct ${deductAmount}` },
          { status: 400 }
        );
      }

      // Use a manual transaction to deduct credits
      const result = await prisma.$transaction(async (tx) => {
        // Create deduction transaction
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            transactionType: 'deduct',
            amount: deductAmount,
            balanceBefore: user.credits,
            balanceAfter: user.credits - deductAmount,
            reason,
            adminUserId,
          },
        });

        // Update user credits
        const updated = await tx.user.update({
          where: { id: user.id },
          data: {
            credits: { decrement: deductAmount },
            totalCreditsConsumed: { increment: deductAmount },
          },
          select: { credits: true },
        });

        return updated.credits;
      });

      newBalance = result;
    }

    const action = amount > 0 ? 'granted' : 'deducted';
    console.log(
      `Admin ${adminUserId} ${action} ${Math.abs(amount)} credits ${amount > 0 ? 'to' : 'from'} ${user.email}. New balance: ${newBalance}`
    );

    return NextResponse.json({
      success: true,
      message: `${amount > 0 ? 'Granted' : 'Deducted'} ${Math.abs(amount)} credits ${amount > 0 ? 'to' : 'from'} ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        previousBalance: user.credits,
        newBalance,
        creditsChanged: amount,
      },
    });
  } catch (error) {
    console.error('Grant credits API error:', error);

    if (error instanceof CreditService.CreditServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to grant credits' },
      { status: 500 }
    );
  }
}
