import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';

/**
 * GET /storage/thumbnails/[filename]
 * Serves generated thumbnail images from local storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename) {
      return new NextResponse('Filename required', { status: 400 });
    }

    // Validate filename (prevent directory traversal)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    // Get storage path from environment
    const storagePath = process.env.STORAGE_PATH;
    if (!storagePath) {
      console.error('[Storage] STORAGE_PATH not configured');
      return new NextResponse('Storage not configured', { status: 500 });
    }

    // Construct file path
    const filePath = resolve(storagePath, 'thumbnails', filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.warn(`[Storage] File not found: ${filePath}`);
      return new NextResponse('Thumbnail not found', { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext || ''] || 'image/png';

    // Return image with caching headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error: any) {
    console.error('[Storage] Error serving thumbnail:', error.message);

    if (error.code === 'ENOENT') {
      return new NextResponse('Thumbnail not found', { status: 404 });
    }

    return new NextResponse('Internal server error', { status: 500 });
  }
}
