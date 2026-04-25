import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { EMERGENCY_ARCHETYPES } from '@/lib/emergency-data';

// GET /api/archetypes?channelId=xxx - List archetypes (filtered by user ownership)

function sanitizeText(str: string, maxLen: number): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim().slice(0, maxLen);
}
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    const role = (session.user as any)?.role;
    const isAdmin = role === 'ADMIN';
    const userEmail = session.user?.email || '';
    // const isTestAccount = userEmail === 'test@test.ai'; // Temporarily disabled

    // Build where clause with user isolation
    let where: any = {};

    if (isAdmin) {
      // Admin sees all archetypes
      if (channelId) {
        where = {
          channel_archetypes: {
            some: {
              channelId,
            },
          },
        };
      }
    } else {
      // Regular users only see their own archetypes
      if (channelId) {
        where = {
          userId: session.user.id,
          channel_archetypes: {
            some: {
              channelId,
            },
          },
        };
      } else {
        where = {
          userId: session.user.id,
        };
      }
    }

    const archetypes = await prisma.archetypes.findMany({
      where,
      include: {
        channel: {
          select: { id: true, name: true },
        },
        channel_archetypes: {
          include: {
            channels: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
    });

    // Filter out admin-only archetypes for non-admins
    const filteredArchetypes = archetypes.filter((arch: any) => {
      if (arch.isAdminOnly && role !== 'ADMIN') {
        return false;
      }
      return true;
    });

    return NextResponse.json(filteredArchetypes);
  } catch (error: any) {
    console.error('Database error in GET /api/archetypes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archetypes. Please try again.' },
      { status: 500 }
    );
  }
}

// POST /api/archetypes - Create new archetype
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, channelIds, imageUrl, layoutInstructions, category, basePrompt, isAdminOnly } = body;

    const userRole = (session.user as any)?.role;
    const userEmail = session.user?.email || '';
    const isTestAccount = userEmail === 'test@test.ai';
    const isAdmin = userRole === 'ADMIN' && !isTestAccount;

    if (!name || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, imageUrl' },
        { status: 400 }
      );
    }

    // Validate channel ownership if channels are provided
    const channelIdsArray = Array.isArray(channelIds) ? channelIds : (channelIds ? [channelIds] : []);

    if (channelIdsArray.length > 0 && !isAdmin) {
      const channels = await prisma.channels.findMany({
        where: {
          id: { in: channelIdsArray },
        },
        select: { id: true, userId: true },
      });

      const invalidChannels = channels.filter(ch => ch.userId !== session.user!.id);
      if (invalidChannels.length > 0) {
        return NextResponse.json(
          { error: 'You do not own all the selected channels' },
          { status: 403 }
        );
      }
    }

    // Create archetype with channel assignments
    const archetype = await prisma.archetypes.create({
      data: {
        id: require('crypto').randomUUID(),
        name,
        imageUrl,
        layoutInstructions: layoutInstructions || '',
        basePrompt: basePrompt || null,
        category: category || 'General',
        isAdminOnly: isAdmin ? (isAdminOnly || false) : false,
        userId: session.user.id,
        updatedAt: new Date(),
        channel_archetypes: {
          create: channelIdsArray.map(channelId => ({
            id: require('crypto').randomUUID(),
            channelId,
          })),
        },
      },
      include: {
        channel_archetypes: {
          include: {
            channels: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ archetype }, { status: 201 });
  } catch (error: any) {
    console.error('Archetype creation error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred creating archetype';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
