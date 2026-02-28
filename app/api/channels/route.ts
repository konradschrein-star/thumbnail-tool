import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/channels - List all channels
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
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

    return NextResponse.json({ channels });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST /api/channels - Create new channel
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
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
        // Fallback for stale client: only include new fields if the client knows them
        ...(typeof (prisma.channel as any).fields?.primaryColor !== 'undefined' ? {
          personaAssetPath,
          logoAssetPath,
          primaryColor: primaryColor || '#ffffff',
          secondaryColor: secondaryColor || '#000000',
          tags
        } : {})
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create channel' },
      { status: 500 }
    );
  }
}
