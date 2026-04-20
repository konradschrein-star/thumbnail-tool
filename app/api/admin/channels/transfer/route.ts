/**
 * Admin API - Transfer Channel Ownership
 *
 * POST /api/admin/channels/transfer
 *
 * Allows admins to reassign channels to different users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';
import { getUserLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  // Check authentication and admin role
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  // Rate limiting: 10 admin requests per minute per admin user
  const limiter = getUserLimiter(`admin:${authResult.user.id}`, 10, 'minute');
  const remainingTokens = await limiter.removeTokens(1);

  if (remainingTokens < 0) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 10 admin requests per minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const userRole = authResult.user.role || 'USER';

  // Admin-only endpoint
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden. Admin access required.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { channelId, targetUserEmail } = body;

    if (!channelId || !targetUserEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, targetUserEmail' },
        { status: 400 }
      );
    }

    // Find target user
    const targetUser = await prisma.user.findUnique({
      where: { email: targetUserEmail.toLowerCase().trim() },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: `User not found: ${targetUserEmail}` },
        { status: 404 }
      );
    }

    // Find channel
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, name: true, userId: true },
    });

    if (!channel) {
      return NextResponse.json(
        { error: `Channel not found: ${channelId}` },
        { status: 404 }
      );
    }

    // Transfer ownership
    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: { userId: targetUser.id },
      include: {
        _count: {
          select: { archetypes: true, generationJobs: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Channel "${channel.name}" transferred to ${targetUser.email}`,
      channel: updatedChannel,
    });
  } catch (error) {
    console.error('Channel transfer error:', error);
    return NextResponse.json(
      { error: 'Failed to transfer channel ownership' },
      { status: 500 }
    );
  }
}

// GET endpoint to list all channels with ownership info (for admin panel)
export async function GET(request: NextRequest) {
  // Check authentication and admin role
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  const userRole = authResult.user.role || 'USER';

  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden. Admin access required.' },
      { status: 403 }
    );
  }

  try {
    const channels = await prisma.channel.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: { archetypes: true, generationJobs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Failed to fetch channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}
