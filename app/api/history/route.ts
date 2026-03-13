import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch last 30 manual jobs
        const masterJobs = await prisma.generationJob.findMany({
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

        // 2. Fetch last 30 variant jobs for this user
        // We filter by user indirectly or by masterJob relation
        const variantJobs = await prisma.variantJob.findMany({
            where: {
                masterJob: {
                    userId: session.user.id
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 30,
            include: {
                masterJob: {
                    include: {
                        channel: true,
                        archetype: true
                    }
                }
            }
        });

        // 3. Map variants to a standardized format that matches HistoryJob
        const mappedVariants = variantJobs.map(v => ({
            id: v.id,
            channelId: v.masterJob?.channelId || '',
            archetypeId: v.masterJob?.archetypeId || '',
            videoTopic: v.masterJob?.videoTopic || 'Translated Variant',
            thumbnailText: v.translatedText,
            customPrompt: null,
            promptUsed: null,
            status: v.status as any,
            outputUrl: v.outputUrl,
            errorMessage: v.errorMessage,
            createdAt: v.createdAt.toISOString(),
            completedAt: v.completedAt?.toISOString() || null,
            isManual: true,
            userId: session.user.id,
            metadata: {
                isVariant: true,
                language: v.language,
                translationMode: v.translationMode,
                originalText: v.originalText
            },
            channel: v.masterJob?.channel,
            archetype: v.masterJob?.archetype
        }));

        // 4. Combine and sort
        const combined = [...masterJobs, ...mappedVariants]
            .sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 50);

        return NextResponse.json(combined);
    } catch (error: any) {
        console.error('History fetch error:', error);
        const errorMessage = error instanceof Error
            ? error.message
            : 'An unexpected error occurred fetching history';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
