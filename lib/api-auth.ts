import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export interface ApiAuthResult {
    user: {
        id: string;
        email: string;
        name: string | null;
        role: string;
        isSuperuser?: boolean;
        isTestUser?: boolean;
    };
    error?: string;
    status?: number;
}

export async function getApiAuth(request: NextRequest): Promise<ApiAuthResult> {
    // 1. First, check if there's an active browser session (NextAuth Cookie)
    const session = await auth();
    if (session?.user?.id) {
        const isTestAccount = session.user.email === 'test@test.ai' || (session.user as any).isTestUser;

        // For browser UI testing, we allow the test account. 
        // However, if we want strict API blocking even in UI, reconsider this.
        // The spec said "test account doesn't have API access", which usually implies headless external access.
        // But since `getApiAuth` is unified, let's block the test account entirely from these endpoints,
        // or allow them only if `request.headers.get('Authorization')` is missing (UI usage) but not for programmatic access?
        // Actually, UI forms use the same `/api/generate` endpoint. If we block it universally, the UI demo breaks.
        // Let's pass the info and let the route decide if it's strictly a headless check, or if we just block the headless branch.

        // Check if the request came via Basic Auth specifically. If no auth header, it's a cookie session.
        const hasAuthHeader = request.headers.has('authorization');
        if (hasAuthHeader && isTestAccount) {
            return {
                user: null as any,
                error: 'Forbidden: Test accounts cannot use programmatic API access.',
                status: 403
            };
        }

        return {
            user: {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.name || null,
                role: (session.user as any).role || 'USER',
                isSuperuser: (session.user as any).isSuperuser,
                isTestUser: isTestAccount,
            }
        };
    }

    // 2. Headless API Access (Basic Authentication)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return { user: null as any, error: 'Unauthorized: Missing credentials or session', status: 401 };
    }

    // Expecting "Basic base64(email:password)"
    if (!authHeader.toLowerCase().startsWith('basic ')) {
        return { user: null as any, error: 'Unauthorized: Unsupported authentication method. Use Basic Auth.', status: 401 };
    }

    try {
        const base64Credentials = authHeader.split(' ')[1];
        const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [email, password] = decodedCredentials.split(':');

        if (!email || !password) {
            return { user: null as any, error: 'Unauthorized: Invalid Basic Auth format', status: 401 };
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Block Demo/Test account from programmatic headless access entirely
        if (normalizedEmail === 'test@test.ai') {
            return { user: null as any, error: 'Forbidden: Test accounts cannot use programmatic API access.', status: 403 };
        }

        // Verify against DB
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user || !user.password) {
            return { user: null as any, error: 'Unauthorized: Invalid credentials', status: 401 };
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return { user: null as any, error: 'Unauthorized: Invalid credentials', status: 401 };
        }

        // Support same flag extraction as auth.ts
        const isTestUser = normalizedEmail === 'test@test.ai' || (user as any).isTestUser;

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isSuperuser: (user as any).isSuperuser,
                isTestUser,
            }
        };
    } catch (err) {
        console.error('Basic Auth Decode Error:', err);
        return { user: null as any, error: 'Unauthorized: Malformed credentials', status: 400 };
    }
}
