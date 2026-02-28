import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch last 30 manual jobs for this user
        const history = await prisma.generationJob.findMany({
            where: {
                userId: session.user.id,
                isManual: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 30,
            include: {
                channel: true,
                archetype: true,
            },
        });

        return NextResponse.json(history);
    } catch (error: any) {
        console.error('History fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch history' },
            { status: 500 }
        );
    }
}
