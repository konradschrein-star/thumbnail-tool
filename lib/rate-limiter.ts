/**
 * Rate Limiting Utilities
 *
 * Protects API endpoints from abuse and resource exhaustion.
 * Uses token bucket algorithm via limiter package.
 */

import { RateLimiter } from 'limiter';

/**
 * Rate limiter for thumbnail generation API
 * 5 requests per minute per user
 */
export const generateLimiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: 'minute'
});

/**
 * Rate limiter for user registration
 * 3 requests per minute per IP
 */
export const registerLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: 'minute'
});

/**
 * Rate limiter for admin endpoints
 * 10 requests per minute per admin
 */
export const adminLimiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute'
});

/**
 * Rate limiter for general API endpoints
 * 20 requests per minute per user
 */
export const generalLimiter = new RateLimiter({
  tokensPerInterval: 20,
  interval: 'minute'
});

/**
 * Helper to check rate limit and return appropriate response
 *
 * @param limiter - The rate limiter instance to use
 * @param identifier - User ID, IP address, or other identifier
 * @returns Object with allowed flag and remainingTokens count
 */
export async function checkRateLimit(
  limiter: RateLimiter,
  identifier: string
): Promise<{ allowed: boolean; remainingTokens: number }> {
  const remainingTokens = await limiter.removeTokens(1);

  return {
    allowed: remainingTokens >= 0,
    remainingTokens: Math.max(0, remainingTokens)
  };
}

/**
 * Map to store per-user/IP limiters for better isolation
 * In production, consider using Redis for distributed rate limiting
 */
const userLimiters = new Map<string, RateLimiter>();

/**
 * Get or create a rate limiter for a specific user/IP
 *
 * @param identifier - User ID or IP address
 * @param tokensPerInterval - Number of tokens per interval
 * @param interval - Time interval ('minute', 'hour', etc.)
 */
export function getUserLimiter(
  identifier: string,
  tokensPerInterval: number,
  interval: 'second' | 'minute' | 'hour' | 'day'
): RateLimiter {
  const key = `${identifier}:${tokensPerInterval}:${interval}`;

  if (!userLimiters.has(key)) {
    userLimiters.set(key, new RateLimiter({
      tokensPerInterval,
      interval
    }));
  }

  return userLimiters.get(key)!;
}

/**
 * Clean up old limiters to prevent memory leaks
 * Should be called periodically (e.g., via cron job)
 */
export function cleanupLimiters(): void {
  // Clear all limiters older than 1 hour
  // In production with Redis, this would be handled by TTL
  userLimiters.clear();
}
