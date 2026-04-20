import { createHmac } from 'crypto';

/**
 * API Key Rotation Service
 *
 * Supports multiple Google API keys for load distribution and resilience.
 * Keys rotate in round-robin fashion to distribute quota usage.
 */

// Load API keys from environment variables
const keys = [
  process.env.GOOGLE_API_KEY,
  process.env.GOOGLE_API_KEY_2,
  process.env.GOOGLE_API_KEY_3,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

/**
 * Get the next API key in rotation
 * @returns The next Google API key to use
 */
export function getRotatedApiKey(): string {
  if (keys.length === 0) {
    throw new Error('No Google API keys configured. Set GOOGLE_API_KEY in environment variables.');
  }

  const key = keys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  return key;
}

/**
 * Get the primary API key (backwards compatibility)
 * @returns The first configured API key
 */
export function getPrimaryApiKey(): string {
  if (keys.length === 0) {
    throw new Error('No Google API keys configured. Set GOOGLE_API_KEY in environment variables.');
  }

  return keys[0];
}

/**
 * Get count of configured API keys
 * @returns Number of available API keys
 */
export function getApiKeyCount(): number {
  return keys.length;
}

/**
 * Sign a request payload for integrity verification
 * @param payload The request payload to sign
 * @param secret The secret key for signing
 * @returns HMAC signature
 */
export function signRequest(payload: any, secret: string): string {
  const signature = createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature;
}

/**
 * Verify a request signature
 * @param payload The request payload
 * @param signature The signature to verify
 * @param secret The secret key for verification
 * @returns True if signature is valid
 */
export function verifyRequestSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signRequest(payload, secret);
  return signature === expectedSignature;
}

/**
 * Get API key statistics (for monitoring)
 * @returns Object with key rotation stats
 */
export function getApiKeyStats() {
  return {
    totalKeys: keys.length,
    currentIndex: currentKeyIndex,
    nextKey: currentKeyIndex,
  };
}
