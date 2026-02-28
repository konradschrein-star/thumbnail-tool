import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        const job = await prisma.generationJob.findUnique({
            where: { id, userId: session.user.id } as any,
            include: {
                channel: true,
                archetype: true,
            },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json(job);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch job' },
            { status: 500 }
        );
    }
}
