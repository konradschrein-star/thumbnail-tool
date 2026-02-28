import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/archetypes/[id] - Fetch single archetype
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const archetype = await prisma.archetype.findUnique({
      where: { id },
      include: {
        channel: {
          select: { id: true, name: true },
        },
      },
    });

    if (!archetype) {
      return NextResponse.json(
        { error: 'Archetype not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ archetype });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch archetype' },
      { status: 500 }
    );
  }
}

// PATCH /api/archetypes/[id] - Update archetype
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, imageUrl, layoutInstructions } = body;

    // Build update data object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (layoutInstructions !== undefined) updateData.layoutInstructions = layoutInstructions;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const archetype = await prisma.archetype.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ archetype });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Archetype not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update archetype' },
      { status: 500 }
    );
  }
}

// DELETE /api/archetypes/[id] - Delete archetype
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.archetype.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Archetype not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete archetype' },
      { status: 500 }
    );
  }
}
