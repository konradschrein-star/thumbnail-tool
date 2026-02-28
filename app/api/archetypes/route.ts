import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/archetypes?channelId=xxx - List archetypes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    // Fetch both target channel archetypes AND global ones (where channelId is null)
    const where: any = channelId
      ? { OR: [{ channelId }, { channelId: null }] }
      : {};

    const archetypes = await prisma.archetype.findMany({
      where,
      include: {
        channel: {
          select: { id: true, name: true },
        },
      },
      // Note: Category sorting is temporarily disabled because the Prisma client 
      // is locked on Windows, preventing regeneration of the new schema.
      orderBy: [
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json({ archetypes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch archetypes' },
      { status: 500 }
    );
  }
}

// POST /api/archetypes - Create new archetype
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, channelId, imageUrl, layoutInstructions, category } = body;

    if (!name || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, imageUrl' },
        { status: 400 }
      );
    }

    const archetype = await prisma.archetype.create({
      data: {
        name,
        channelId: channelId || null,
        imageUrl,
        layoutInstructions: layoutInstructions || '',
        category: category || 'General',
      } as any,
    });

    return NextResponse.json({ archetype }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create archetype' },
      { status: 500 }
    );
  }
}
