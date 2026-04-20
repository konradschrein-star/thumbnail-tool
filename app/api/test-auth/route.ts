import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      return NextResponse.json({
        success: false,
        message: 'User not found or no password set',
      });
    }

    const isValid = await bcrypt.compare(password, user.password);

    return NextResponse.json({
      success: isValid,
      message: isValid ? 'Password correct!' : 'Password incorrect',
      user: user ? {
        id: user.id,
        email: user.email,
        role: (user as any).role,
        passwordLength: user.password.length,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
