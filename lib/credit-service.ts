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
        const user = await tx.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            credits: true,
            total_credits_consumed: true
          },
        });

        if (!user) {
          throw new CreditServiceError('User not found');
        }

        // Check if user has sufficient credits
        if (user.credits < creditsRequired) {
          throw new InsufficientCreditsError(creditsRequired, user.credits);
        }

        const balance_before = user.credits;
        const balance_after = balance_before - creditsRequired;

        // Update user credits and consumption counter atomically
        await tx.users.update({
          where: { id: userId },
          data: {
            credits: balance_after,
            total_credits_consumed: {
              increment: creditsRequired,
            },
          },
        });

        // Create generation job with credit tracking
        const job = await tx.generation_jobs.create({
          data: {
            ...jobData,
            userId,
            status: 'processing',
          },
        });

        // Log the transaction
        await tx.credit_transactions.create({
          data: {
            id: require("crypto").randomUUID(),
            user_id: userId,
            transaction_type: 'deduct',
            amount: -creditsRequired,
            balance_before,
            balance_after,
            reason: `Deducted for job: ${job.videoTopic}`,
            related_job_id: job.id,
          },
        });

        return { job, creditsRemaining: balance_after };
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
 * @param related_job_id - Optional job/variant ID to link the transaction to
 * @returns Remaining credit balance
 * @throws InsufficientCreditsError if user doesn't have enough credits
 */
export async function deductCreditsForJob(
  userId: string,
  count: number,
  reason: string,
  related_job_id?: string | null
) {
  if (count <= 0) {
    throw new CreditServiceError('Deduction amount must be positive');
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the user row and get current balance
        const user = await tx.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            credits: true,
            total_credits_consumed: true
          },
        });

        if (!user) {
          throw new CreditServiceError('User not found');
        }

        // Check if user has sufficient credits
        if (user.credits < count) {
          throw new InsufficientCreditsError(count, user.credits);
        }

        const balance_before = user.credits;
        const balance_after = balance_before - count;

        // Update user credits and consumption counter atomically
        await tx.users.update({
          where: { id: userId },
          data: {
            credits: balance_after,
            total_credits_consumed: {
              increment: count,
            },
          },
        });

        // Log the transaction
        await tx.credit_transactions.create({
          data: {
            id: require("crypto").randomUUID(),
            user_id: userId,
            transaction_type: 'deduct',
            amount: -count,
            balance_before,
            balance_after,
            reason,
            related_job_id: related_job_id || null,
          },
        });

        return balance_after;
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
 * Deducts credits for a batch operation and creates the batch_jobs record atomically.
 * This prevents race conditions where multiple concurrent batch uploads could overdraw credits.
 *
 * @param userId - User ID to deduct credits from
 * @param batchSize - Number of jobs in the batch (= credits to deduct)
 * @param batchName - Name of the batch for the batch_jobs record
 * @param reason - Reason for deduction
 * @returns Object with created batch job and remaining credits
 * @throws InsufficientCreditsError if user doesn't have enough credits
 */
export async function deductCreditsForBatch(
  userId: string,
  batchSize: number,
  batchName: string,
  reason: string
): Promise<{
  batchJob: any;
  creditsRemaining: number;
}> {
  if (batchSize <= 0) {
    throw new CreditServiceError('Batch size must be positive');
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the user row and get current balance
        const user = await tx.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            credits: true,
            total_credits_consumed: true,
            role: true
          },
        });

        if (!user) {
          throw new CreditServiceError('User not found');
        }

        // Check if user has sufficient credits
        if (user.credits < batchSize) {
          throw new InsufficientCreditsError(batchSize, user.credits);
        }

        const balance_before = user.credits;
        const balance_after = balance_before - batchSize;

        // Deduct credits
        await tx.users.update({
          where: { id: userId },
          data: {
            credits: balance_after,
            total_credits_consumed: {
              increment: batchSize,
            },
          },
        });

        // Create batch_jobs record
        const batchJob = await tx.batch_jobs.create({
          data: {
            name: batchName,
            userId,
            status: 'PENDING',
            totalJobs: batchSize,
            credits_deducted: batchSize,
          },
        });

        // Log the transaction
        await tx.credit_transactions.create({
          data: {
            id: require("crypto").randomUUID(),
            user_id: userId,
            transaction_type: 'deduct',
            amount: -batchSize,
            balance_before,
            balance_after,
            reason,
            related_batch_id: batchJob.id,
          },
        });

        return {
          batchJob,
          creditsRemaining: balance_after,
        };
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
        const user = await tx.users.findUnique({
          where: { id: userId },
          select: { credits: true, total_credits_granted: true },
        });

        if (!user) {
          throw new CreditServiceError('User not found');
        }

        const balance_before = user.credits;
        const balance_after = balance_before + amount;

        // Grant credits and update granted counter
        await tx.users.update({
          where: { id: userId },
          data: {
            credits: balance_after,
            total_credits_granted: {
              increment: amount,
            },
          },
        });

        // Log the grant transaction
        await tx.credit_transactions.create({
          data: {
            id: require("crypto").randomUUID(),
            user_id: userId,
            transaction_type: 'grant',
            amount,
            balance_before,
            balance_after,
            reason,
            admin_user_id: adminUserId,
          },
        });

        return balance_after;
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
    const user = await prisma.users.findUnique({
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
    const transactions = await prisma.credit_transactions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        transaction_type: true,
        amount: true,
        balance_before: true,
        balance_after: true,
        reason: true,
        related_job_id: true,
        admin_user_id: true,
        created_at: true,
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
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        total_credits_granted: true,
        total_credits_consumed: true,
      },
    });

    if (!user) {
      throw new CreditServiceError('User not found');
    }

    return {
      currentBalance: user.credits,
      totalGranted: user.total_credits_granted,
      totalConsumed: user.total_credits_consumed,
      netBalance: user.total_credits_granted - user.total_credits_consumed,
    };
  } catch (error) {
    throw new CreditServiceError(
      error instanceof Error ? error.message : 'Unknown error fetching stats'
    );
  }
}
