import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/channels/[id] - Fetch single channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const channel = await prisma.channels.findUnique({
      where: { id },
      include: {
        _count: {
          select: { channel_archetypes: true, generation_jobs: true },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Check ownership (admins bypass this check)
    const role = (session.user as any)?.role;
    const isAdmin = role === 'ADMIN';

    if (!isAdmin && channel.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this channel' },
        { status: 403 }
      );
    }

    return NextResponse.json({ channel });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channel' },
      { status: 500 }
    );
  }
}

// PATCH /api/channels/[id] - Update channel
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, personaDescription, personaAssetPath, primaryColor, secondaryColor, tags } = body;

    // Build update data object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (personaDescription !== undefined) updateData.personaDescription = personaDescription;
    if (personaAssetPath !== undefined) updateData.personaAssetPath = personaAssetPath;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (tags !== undefined) updateData.tags = typeof tags === 'string' ? (tags.trim() || null) : (Array.isArray(tags) && tags.length > 0 ? tags.join(',') : null);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Verify ownership before updating
    const existingChannel = await prisma.channels.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingChannel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Check ownership (admins bypass this check)
    const role = (session.user as any)?.role;
    const isAdmin = role === 'ADMIN';

    if (!isAdmin && existingChannel.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this channel' },
        { status: 403 }
      );
    }

    const channel = await prisma.channels.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ channel });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update channel' },
      { status: 500 }
    );
  }
}

// DELETE /api/channels/[id] - Delete channel (cascades to archetypes and jobs)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const existingChannel = await prisma.channels.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingChannel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Check ownership (admins bypass this check)
    const role = (session.user as any)?.role;
    const isAdmin = role === 'ADMIN';

    if (!isAdmin && existingChannel.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this channel' },
        { status: 403 }
      );
    }

    await prisma.channels.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete channel' },
      { status: 500 }
    );
  }
}
