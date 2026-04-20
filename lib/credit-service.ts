/**
 * Credit Service
 *
 * Handles all credit-related operations with atomic transactions to prevent race conditions.
 * Uses Prisma's Serializable isolation level to ensure consistency even with concurrent requests.
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Custom error classes
export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public available: number,
    message: string = `Insufficient credits. Required: ${required}, Available: ${available}`
  ) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export class CreditServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreditServiceError';
  }
}

/**
 * Deducts credits and creates a generation job atomically.
 * This prevents race conditions where multiple concurrent requests could overdraw credits.
 *
 * @param userId - User ID to deduct credits from
 * @param creditsRequired - Number of credits to deduct
 * @param jobData - Data for creating the GenerationJob
 * @returns Object with created job and remaining credits
 * @throws InsufficientCreditsError if user doesn't have enough credits
 */
export async function deductCreditsAndCreateJob(
  userId: string,
  creditsRequired: number,
  jobData: {
    channelId: string;
    archetypeId: string;
    videoTopic: string;
    thumbnailText: string;
    customPrompt?: string | null;
    isManual?: boolean;
  }
) {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the user row and get current balance
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            credits: true,
            totalCreditsConsumed: true
          },
        });

        if (!user) {
          throw new CreditServiceError('User not found');
        }

        // Check if user has sufficient credits
        if (user.credits < creditsRequired) {
          throw new InsufficientCreditsError(creditsRequired, user.credits);
        }

        const balanceBefore = user.credits;
        const balanceAfter = balanceBefore - creditsRequired;

        // Update user credits and consumption counter atomically
        await tx.user.update({
          where: { id: userId },
          data: {
            credits: balanceAfter,
            totalCreditsConsumed: {
              increment: creditsRequired,
            },
          },
        });

        // Create generation job with credit tracking
        const job = await tx.generationJob.create({
          data: {
            ...jobData,
            userId,
            creditsDeducted: creditsRequired,
            status: 'processing',
          },
        });

        // Log the transaction
        await tx.creditTransaction.create({
          data: {
            userId,
            transactionType: 'deduct',
            amount: -creditsRequired,
            balanceBefore,
            balanceAfter,
            reason: `Deducted for job: ${job.videoTopic}`,
            relatedJobId: job.id,
          },
        });

        return { job, creditsRemaining: balanceAfter };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000, // 10 second timeout
      }
    );

    return result;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new CreditServiceError(`Database error: ${error.message}`);
    }
    throw new CreditServiceError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// REFUND FUNCTIONALITY REMOVED
// Credits are not refunded on failure to prevent exploitation
// Cost per generation is low enough that failed attempts are acceptable losses

/**
 * Deducts credits for an operation without creating a job (e.g., translations, variants).
 * Used when a job/variant is already created and we just need to deduct credits.
 *
 * @param userId - User ID to deduct credits from
 * @param count - Number of credits to deduct
 * @param reason - Reason for deduction
 * @param relatedJobId - Optional job/variant ID to link the transaction to
 * @returns Remaining credit balance
 * @throws InsufficientCreditsError if user doesn't have enough credits
 */
export async function deductCreditsForJob(
  userId: string,
  count: number,
  reason: string,
  relatedJobId?: string | null
) {
  if (count <= 0) {
    throw new CreditServiceError('Deduction amount must be positive');
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the user row and get current balance
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            credits: true,
            totalCreditsConsumed: true
          },
        });

        if (!user) {
          throw new CreditServiceError('User not found');
        }

        // Check if user has sufficient credits
        if (user.credits < count) {
          throw new InsufficientCreditsError(count, user.credits);
        }

        const balanceBefore = user.credits;
        const balanceAfter = balanceBefore - count;

        // Update user credits and consumption counter atomically
        await tx.user.update({
          where: { id: userId },
          data: {
            credits: balanceAfter,
            totalCreditsConsumed: {
              increment: count,
            },
          },
        });

        // Log the transaction
        await tx.creditTransaction.create({
          data: {
            userId,
            transactionType: 'deduct',
            amount: -count,
            balanceBefore,
            balanceAfter,
            reason,
            relatedJobId: relatedJobId || null,
          },
        });

        return balanceAfter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000, // 10 second timeout
      }
    );

    return result;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new CreditServiceError(`Database error: ${error.message}`);
    }
    throw new CreditServiceError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Grants credits to a user (admin function).
 *
 * @param userId - User ID to grant credits to
 * @param amount - Number of credits to grant (positive number)
 * @param adminUserId - ID of the admin granting the credits
 * @param reason - Reason for granting credits
 * @returns Updated credit balance
 */
export async function grantCredits(
  userId: string,
  amount: number,
  adminUserId: string,
  reason: string
) {
  if (amount <= 0) {
    throw new CreditServiceError('Grant amount must be positive');
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { credits: true, totalCreditsGranted: true },
        });

        if (!user) {
          throw new CreditServiceError('User not found');
        }

        const balanceBefore = user.credits;
        const balanceAfter = balanceBefore + amount;

        // Grant credits and update granted counter
        await tx.user.update({
          where: { id: userId },
          data: {
            credits: balanceAfter,
            totalCreditsGranted: {
              increment: amount,
            },
          },
        });

        // Log the grant transaction
        await tx.creditTransaction.create({
          data: {
            userId,
            transactionType: 'grant',
            amount,
            balanceBefore,
            balanceAfter,
            reason,
            adminUserId,
          },
        });

        return balanceAfter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return result;
  } catch (error) {
    throw new CreditServiceError(
      error instanceof Error ? error.message : 'Unknown error during grant'
    );
  }
}

/**
 * Gets the current credit balance for a user.
 *
 * @param userId - User ID
 * @returns Current credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new CreditServiceError('User not found');
    }

    return user.credits;
  } catch (error) {
    throw new CreditServiceError(
      error instanceof Error ? error.message : 'Unknown error fetching credits'
    );
  }
}

/**
 * Gets transaction history for a user with pagination.
 *
 * @param userId - User ID
 * @param limit - Number of transactions to return
 * @param offset - Number of transactions to skip
 * @returns Array of credit transactions
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
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
      },
    });

    return transactions;
  } catch (error) {
    throw new CreditServiceError(
      error instanceof Error
        ? error.message
        : 'Unknown error fetching transaction history'
    );
  }
}

/**
 * Gets transaction statistics for a user.
 *
 * @param userId - User ID
 * @returns Statistics object with total granted, consumed, and current balance
 */
export async function getUserCreditStats(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        totalCreditsGranted: true,
        totalCreditsConsumed: true,
      },
    });

    if (!user) {
      throw new CreditServiceError('User not found');
    }

    return {
      currentBalance: user.credits,
      totalGranted: user.totalCreditsGranted,
      totalConsumed: user.totalCreditsConsumed,
      netBalance: user.totalCreditsGranted - user.totalCreditsConsumed,
    };
  } catch (error) {
    throw new CreditServiceError(
      error instanceof Error ? error.message : 'Unknown error fetching stats'
    );
  }
}
