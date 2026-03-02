/**
 * Environmental Validation Utility
 * Ensures all required environment variables are present and valid for the "Titan" runtime.
 */

export interface EnvValidationResult {
    isValid: boolean;
    missing: string[];
    warnings: string[];
}

export function validateEnv(): EnvValidationResult {
    const required = [
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
    ];

    const secondary = [
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_ENDPOINT',
        'R2_BUCKET_NAME',
        'R2_PUBLIC_URL',
    ];

    const missing = required.filter(key => !process.env[key]);
    const warningMissing = secondary.filter(key => !process.env[key]);

    return {
        isValid: missing.length === 0,
        missing,
        warnings: warningMissing,
    };
}

/**
 * Server-side check for API routes
 */
export function ensureEnvOrThrow() {
    // Skip critical checks during static optimization/build
    // Next.js uses various phase flags, Vercel also explicitly runs with CI=1
    if (
        process.env.NEXT_PHASE === 'phase-production-build' ||
        process.env.npm_lifecycle_event === 'build' ||
        process.env.CI === '1' || process.env.VERCEL === '1'
    ) {
        return;
    }
    const result = validateEnv();
    if (!result.isValid) {
        throw new Error(`Critical environment variables missing: ${result.missing.join(', ')}`);
    }
}
