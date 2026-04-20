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
        const masterJobs = await prisma.generation_jobs.findMany({
            where: {
                userId: session.user.id,
                isManual: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 30,
            include: {
                channels: true,
                archetypes: true,
            },
        });

        // 2. Fetch last 30 variant jobs for this user
        // We filter by user indirectly or by masterJob relation
        const variantJobs = await prisma.variant_jobs.findMany({
            where: {
                generation_jobs: {
                    userId: session.user.id
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 30,
            include: {
                generation_jobs: {
                    include: {
                        channels: true,
                        archetypes: true
                    }
                }
            }
        });

        // 3. Map variants to a standardized format that matches HistoryJob
        const currentUserId = session.user.id;
        const mappedVariants = (variantJobs as any[]).map(v => ({
            id: v.id,
            channelId: v.generation_jobs?.channelId || '',
            archetypeId: v.generation_jobs?.archetypeId || '',
            videoTopic: v.generation_jobs?.videoTopic || 'Translated Variant',
            thumbnailText: v.translatedText,
            customPrompt: null,
            promptUsed: null,
            status: v.status as any,
            outputUrl: v.outputUrl,
            errorMessage: v.errorMessage,
            createdAt: v.createdAt.toISOString(),
            completedAt: v.completedAt?.toISOString() || null,
            isManual: true,
            userId: currentUserId,
            metadata: {
                isVariant: true,
                language: v.language,
                translationMode: v.translationMode as string,
                originalText: v.originalText as string
            },
            channel: v.generation_jobs?.channel,
            archetype: v.generation_jobs?.archetype
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
