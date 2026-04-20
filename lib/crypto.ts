/**
 * Encryption Utilities for Sensitive Data
 * Provides AES-256-GCM encryption for storing OAuth tokens and sensitive credentials
 *
 * Usage:
 *   const encrypted = encrypt('secret-token', key);
 *   const decrypted = decrypt(encrypted, key);
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Configuration for encryption
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for AES IV
const SALT_LENGTH = 16; // 128 bits for salt
const TAG_LENGTH = 16; // 128 bits for auth tag
const KEY_LENGTH = 32; // 256 bits for AES-256
const SCRYPT_N = 2 ** 14; // CPU/memory cost parameter

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
}

/**
 * Generate a new encryption key from a password
 * Uses scrypt key derivation function for security
 *
 * @param password - The password to derive key from
 * @param salt - Optional salt (generates if not provided)
 * @returns Object with key and salt (both as base64)
 */
export function generateEncryptionKey(password: string, salt?: Buffer): { key: Buffer; salt: Buffer } {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const actualSalt = salt || randomBytes(SALT_LENGTH);

  // Derive key using scrypt
  const key = scryptSync(password, actualSalt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024, // 64MB max
  });

  return { key, salt: actualSalt };
}

/**
 * Encrypt text using AES-256-GCM
 * Returns encrypted data with IV and auth tag for authenticity verification
 *
 * @param plaintext - The text to encrypt
 * @param encryptionKey - The encryption key (must be 32 bytes for AES-256)
 * @returns Encrypted data object with all components as base64 strings
 */
export function encrypt(plaintext: string, encryptionKey: Buffer): EncryptedData {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty');
  }

  if (!encryptionKey || encryptionKey.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (256 bits)`);
  }

  try {
    // Generate random IV for this encryption
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);

    // Encrypt the plaintext
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Generate salt for key derivation (store with encrypted data for key regeneration)
    const salt = randomBytes(SALT_LENGTH);

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypt text using AES-256-GCM
 * Verifies authenticity using the stored auth tag
 *
 * @param encryptedData - The encrypted data object (from encrypt())
 * @param encryptionKey - The encryption key (must match the key used to encrypt)
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedData: EncryptedData, encryptionKey: Buffer): string {
  if (!encryptedData || !encryptedData.ciphertext || !encryptedData.iv || !encryptedData.authTag) {
    throw new Error('Invalid encrypted data format');
  }

  if (!encryptionKey || encryptionKey.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (256 bits)`);
  }

  try {
    // Recreate IV and auth tag from stored values
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the ciphertext
    let plaintext = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : String(error)}. This usually means the key is incorrect or the data was corrupted.`
    );
  }
}

/**
 * Encrypt and encode as JSON string
 * Convenience function for storing encrypted data in database
 *
 * @param plaintext - The text to encrypt
 * @param encryptionKey - The encryption key
 * @returns JSON string of encrypted data
 */
export function encryptAndEncode(plaintext: string, encryptionKey: Buffer): string {
  const encrypted = encrypt(plaintext, encryptionKey);
  return JSON.stringify(encrypted);
}

/**
 * Decode from JSON string and decrypt
 * Convenience function for retrieving encrypted data from database
 *
 * @param encodedData - JSON string of encrypted data
 * @param encryptionKey - The encryption key
 * @returns Decrypted plaintext
 */
export function decodeAndDecrypt(encodedData: string, encryptionKey: Buffer): string {
  try {
    const encryptedData: EncryptedData = JSON.parse(encodedData);
    return decrypt(encryptedData, encryptionKey);
  } catch (error) {
    throw new Error(`Failed to decode and decrypt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get encryption key from environment variable (password)
 * Optionally accepts stored salt for deterministic decryption
 *
 * @param salt - Optional salt (base64 encoded) for deterministic key regeneration
 * @returns The encryption key buffer
 */
export function getEncryptionKeyFromEnv(salt?: string): Buffer {
  const password = process.env.ENCRYPTION_PASSWORD;
  if (!password) {
    throw new Error('ENCRYPTION_PASSWORD environment variable is required');
  }

  const saltBuffer = salt ? Buffer.from(salt, 'base64') : undefined;
  const { key } = generateEncryptionKey(password, saltBuffer);

  return key;
}
