import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { EMERGENCY_CHANNELS } from '@/lib/emergency-data';

// GET /api/channels - List all channels (filtered by user, admin sees all)
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = (session.user as any)?.role || 'USER';
    const isAdmin = userRole === 'ADMIN';

    const channels = await prisma.channels.findMany({
      where: isAdmin ? {} : { userId: session.user.id }, // Admin sees all, users see only their own
      include: {
        _count: {
          select: { channel_archetypes: true, generation_jobs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error('Database error in GET /api/channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels. Please try again.' },
      { status: 500 }
    );
  }
}

// POST /api/channels - Create new channel
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      personaDescription,
      personaAssetPath,
      logoAssetPath,
      primaryColor,
      secondaryColor,
      tags
    } = body;

    if (!name || !personaDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: name, personaDescription' },
        { status: 400 }
      );
    }

    // Note: To prevent runtime crashes on Windows due to the Prisma client lock,
    // we are currently only persisting core fields. Branding tokens and assets
    // will be fully functional once the server is restarted and the client 
    // regenerates.
    const channel = await prisma.channels.create({
      data: {
        name,
        personaDescription,
        user: { connect: { id: session.user.id } },
        personaAssetPath,
        logoAssetPath,
        primaryColor: primaryColor || '#ffffff',
        secondaryColor: secondaryColor || '#000000',
        tags: typeof tags === 'string' ? (tags.trim() || null) : (Array.isArray(tags) && tags.length > 0 ? tags.join(',') : null)
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error: any) {
    console.error('Channel creation error:', error);

    // Sanitize Prisma connection errors for the frontend
    if (error.message?.includes('Can\'t reach database server')) {
      return NextResponse.json(
        { error: 'Database connection timeout. Please verify your Vercel Connection Pooler (IPv4) settings.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create channel' },
      { status: 500 }
    );
  }
}
