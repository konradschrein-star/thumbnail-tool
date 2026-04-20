/**
 * Password Service
 *
 * Handles password hashing with bcrypt.
 * Note: argon2 temporarily disabled due to serverless bundling issues.
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type HashAlgorithm = 'bcrypt';

export interface VerificationResult {
  valid: boolean;
  needsUpgrade: boolean;
}

/**
 * Hashes a password using bcrypt.
 *
 * @param plainPassword - The plain text password
 * @returns Hashed password string
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const saltRounds = 12;
    return bcrypt.hash(plainPassword, saltRounds);
  } catch (error) {
    throw new Error(
      `Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verifies a password against a hash using bcrypt.
 *
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The stored hash
 * @param algorithm - The hashing algorithm used (must be 'bcrypt')
 * @returns Object with validation result and upgrade recommendation
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
  algorithm: HashAlgorithm
): Promise<VerificationResult> {
  try {
    if (algorithm !== 'bcrypt') {
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }

    // Verify with bcrypt
    const valid = await bcrypt.compare(plainPassword, hashedPassword);

    return {
      valid,
      needsUpgrade: false,
    };
  } catch (error) {
    // If verification fails (e.g., invalid hash format), return invalid
    console.error('Password verification error:', error);
    return {
      valid: false,
      needsUpgrade: false,
    };
  }
}

/**
 * Upgrades a user's password hash (currently no-op since we use bcrypt only).
 *
 * @param userId - The user ID
 * @param plainPassword - The plain text password (from login attempt)
 * @returns True if upgrade was successful
 */
export async function upgradePasswordHash(
  userId: string,
  plainPassword: string
): Promise<boolean> {
  try {
    // Re-hash with bcrypt
    const newHash = await hashPassword(plainPassword);

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newHash,
        passwordHashAlgorithm: 'bcrypt',
      },
    });

    console.log(`Password hash updated for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to upgrade password hash:', error);
    return false;
  }
}

/**
 * Hashes a password using bcrypt (for backward compatibility).
 *
 * @param plainPassword - The plain text password
 * @returns Hashed password string
 */
export async function hashPasswordBcrypt(plainPassword: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Checks if a password meets minimum security requirements.
 *
 * @param password - The password to validate
 * @returns Object with validation result and error message if invalid
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one letter',
    };
  }

  return { valid: true };
}
