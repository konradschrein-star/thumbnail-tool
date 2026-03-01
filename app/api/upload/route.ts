import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as r2Service from '@/lib/r2-service';

// POST /api/upload - Handle file uploads directly to R2
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'archetypes';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WEBP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${originalName}`;
    const r2Key = `${folder}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to R2 (Mandatory)
    const url = await r2Service.uploadToR2(buffer, r2Key, file.type);

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    // Check if the stream or parsing failed due to unexpected multi-part data
    if (error instanceof TypeError && error.message.includes('stream')) {
      return NextResponse.json(
        { error: 'Invalid or corrupt file upload stream.' },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred during upload';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
