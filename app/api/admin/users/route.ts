/**
 * Admin API - User Management
 *
 * GET /api/admin/users - List all users with credit balances
 * POST /api/admin/users - Create a new user
 * PATCH /api/admin/users - Update a user
 * DELETE /api/admin/users - Delete a user
 *
 * Query params (GET):
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - email: string (search filter, optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';
import { getUserLimiter } from '@/lib/rate-limiter';
import { hashPassword } from '@/lib/password-service';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
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
      {
        error: 'Rate limit exceeded. Maximum 10 admin requests per minute.',
        retryAfter: 60
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      }
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const emailFilter = searchParams.get('email');

    // Build where clause for email search
    const where = emailFilter
      ? {
          email: {
            contains: emailFilter,
            mode: 'insensitive' as const,
          },
        }
      : {};

    // Fetch users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          credits: true,
          totalCreditsGranted: true,
          totalCreditsConsumed: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { email, name, password: providedPassword, role, credits } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate password if not provided
    const password = providedPassword || randomBytes(8).toString('hex');
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || null,
        password: hashedPassword,
        passwordHashAlgorithm: 'bcrypt',
        role: role || 'USER',
        credits: credits || 0,
        totalCreditsGranted: credits || 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      temporaryPassword: password, // Return password ONCE for admin to share with user
      message: `User created successfully. Temporary password: ${password}`,
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const body = await request.json();
    const { userId, email, name, role, newPassword } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (email !== undefined) {
      // Check if new email is already taken
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use by another user' },
          { status: 409 }
        );
      }

      updateData.email = email.toLowerCase().trim();
    }

    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;

    if (newPassword) {
      updateData.password = await hashPassword(newPassword);
      updateData.passwordHashAlgorithm = 'bcrypt';
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      newPassword: newPassword || null, // Return new password if it was reset
      message: newPassword
        ? `User updated. New password: ${newPassword}`
        : 'User updated successfully',
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (userId === authResult.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin account' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
