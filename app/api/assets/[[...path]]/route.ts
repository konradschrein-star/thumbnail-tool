import { NextRequest, NextResponse } from 'next/server';
import { getObjectFromR2 } from '@/lib/r2-service';

// GET /api/assets/[...path] - Proxy images from R2 to avoid public bucket exposure
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    try {
        // Reconstruct the R2 key from path segments
        const { path: pathSegments } = await params;
        if (!pathSegments || pathSegments.length === 0) {
            return new NextResponse('Asset path required', { status: 400 });
        }

        const key = pathSegments.join('/');
        const { buffer, contentType } = await getObjectFromR2(key);

        const { searchParams } = new URL(request.url);
        const download = searchParams.get('download');

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year

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

        if (error.message.includes('NoSuchKey') || error.message.includes('404')) {
            return new NextResponse('Asset not found', { status: 404 });
        }

        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
