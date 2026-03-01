import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { EMERGENCY_CHANNELS } from '@/lib/emergency-data';

// GET /api/channels - List all channels
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channels = await prisma.channel.findMany({
      include: {
        _count: {
          select: { archetypes: true, generationJobs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ channels: channels.length > 0 ? channels : EMERGENCY_CHANNELS });
  } catch (error: any) {
    console.error('Database error in GET /api/channels:', error);
    return NextResponse.json({ channels: EMERGENCY_CHANNELS, isOffline: true });
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
    const channel = await prisma.channel.create({
      data: {
        name,
        personaDescription,
        userId: session.user.id, // Fixed: correctly linking channel to user
        personaAssetPath,
        logoAssetPath,
        primaryColor: primaryColor || '#ffffff',
        secondaryColor: secondaryColor || '#000000',
        tags: tags || []
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
