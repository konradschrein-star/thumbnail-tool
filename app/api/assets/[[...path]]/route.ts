import { NextRequest, NextResponse } from 'next/server';
import { getObjectFromR2 } from '@/lib/r2-service';
import { auth } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// GET /api/assets/[...path] - Serve from local files first, fallback to R2
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const session = await auth();

    try {
        // Reconstruct the path from segments
        const { path: pathSegments } = await params;
        if (!pathSegments || pathSegments.length === 0) {
            return new NextResponse('Asset path required', { status: 400 });
        }

        const key = pathSegments.join('/');

        // SECURITY CHECK: Scoped Access
        // assets like logos or archetypes (not in /users/ folder) are public to all logged-in users.
        // user-generated thumbnails (in /users/ folder) are only visible to the owner or admins.
        if (key.startsWith('users/')) {
            if (!session?.user?.email) {
                return new NextResponse('Unauthorized: Please log in', { status: 401 });
            }

            const userRole = (session.user as any).role;
            const isSuperuser = (session.user as any).isSuperuser;
            const requestedFolder = pathSegments[1]; // users/{email or test-user}/...

            // Allow if:
            // 1. User is an ADMIN or Superuser
            // 2. User is requested 'test-user' folder (shared access)
            // 3. User is owner of the folder (matches email)
            const isOwner = requestedFolder === session.user.email;
            const isSharedTest = requestedFolder === 'test-user';
            const isAuthorized = userRole === 'ADMIN' || isSuperuser || isOwner || isSharedTest;

            if (!isAuthorized) {
                return new NextResponse('Forbidden: You do not have access to this asset', { status: 403 });
            }
        } else {
            // Non-user assets (archetypes, logos) require at least a session
            if (!session) {
                return new NextResponse('Unauthorized', { status: 401 });
            }
        }

        // Try to serve from local filesystem first
        const localPath = join(process.cwd(), 'public', 'api', 'assets', key);

        if (existsSync(localPath)) {
            // Serve from local file
            const fileBuffer = await readFile(localPath);

            // Determine content type from extension
            const ext = key.split('.').pop()?.toLowerCase();
            const contentTypeMap: Record<string, string> = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml',
            };
            const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

            const { searchParams } = new URL(request.url);
            const download = searchParams.get('download');

            const headers = new Headers();
            headers.set('Content-Type', contentType);
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');

            if (download === '1' || download === 'true') {
                const filename = pathSegments[pathSegments.length - 1];
                headers.set('Content-Disposition', `attachment; filename="${filename}"`);
            } else {
                headers.set('Content-Disposition', 'inline');
            }

            return new NextResponse(fileBuffer, {
                status: 200,
                headers,
            });
        }

        // Fallback to R2 if local file doesn't exist
        const { buffer, contentType } = await getObjectFromR2(key);

        const { searchParams } = new URL(request.url);
        const download = searchParams.get('download');

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        if (download === '1' || download === 'true') {
            const filename = pathSegments[pathSegments.length - 1];
            headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        } else {
            headers.set('Content-Disposition', 'inline');
        }

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error(`Asset Proxy Error (${request.url}):`, error.message);

        if (error.message?.includes('NoSuchKey') || error.message?.includes('404') || error.code === 'ENOENT') {
            return new NextResponse('Asset not found', { status: 404 });
        }

        const errorMessage = error instanceof Error
            ? error.message
            : 'An unexpected error occurred during asset proxying';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
