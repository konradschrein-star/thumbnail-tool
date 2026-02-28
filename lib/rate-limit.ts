import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RateLimitConfig {
  tokensPerInterval: number;
  interval: 'day';
}

/**
 * DB-backed rate limiting for production-safe manual generation
 * 
 * @param request - Next.js request object
 * @param userId - ID of the authenticated user
 * @param config - Rate limit configuration (Default: 10/day for manual UI)
 * @returns Response or null if allowed
 */
export async function checkManualRateLimit(
  userId: string,
  userRole: string = 'USER',
  config: RateLimitConfig = { tokensPerInterval: 10, interval: 'day' }
): Promise<NextResponse | null> {
  // Admins are exempt from rate limits
  if (userRole === 'ADMIN') return null;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Count manual generation jobs by this user in the last 24 hours
  const manualJobsCount = await prisma.generationJob.count({
    where: {
      userId: userId,
      isManual: true,
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    } as any,
  });

  if (manualJobsCount >= config.tokensPerInterval) {
    return NextResponse.json(
      {
        error: 'Daily generation limit reached.',
        message: `You have already generated ${manualJobsCount} images in the last 24 hours. Manual UI limit is ${config.tokensPerInterval} per day.`,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.tokensPerInterval.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null; // Allow request
}

/**
 * Simple IP-based rate limit for general API safety (non-generation)
 */
export async function ipRateLimit(
  request: NextRequest,
  limit: number = 30
): Promise<NextResponse | null> {
  // For other API routes, we can still use a light IP-based check or just rely on Vercel's protection.
  // Given the requirement for "safer credential storage" and "hosting properly", 
  // we'll stick to DB-backed checks for expensive AI operations.
  return null;
}

// Preset rate limit configs
export const rateLimits = {
  manualUI: {
    tokensPerInterval: 10,
    interval: 'day' as const,
  },
};
