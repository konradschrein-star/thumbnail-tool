import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query parameters for filtering
        const { searchParams } = new URL(request.url);
        const typeFilter = searchParams.get('type') || 'all'; // all|single|batch|translation
        const statusFilter = searchParams.get('status'); // pending|processing|completed|failed

        // Build where clause for generation_jobs
        const masterJobsWhere: any = {
            userId: session.user.id,
        };

        // Apply type filter for master jobs
        if (typeFilter === 'single') {
            masterJobsWhere.isManual = true;
            masterJobsWhere.batchJobId = null;
        } else if (typeFilter === 'batch') {
            masterJobsWhere.batchJobId = { not: null };
        } else if (typeFilter === 'translation') {
            // Skip master jobs entirely for translation filter
            masterJobsWhere.id = 'skip';
        } else {
            // For 'all', fetch all jobs (manual and batch)
            masterJobsWhere.OR = [
                { isManual: true },
                { batchJobId: { not: null } }
            ];
        }

        // Apply status filter
        if (statusFilter) {
            masterJobsWhere.status = statusFilter;
        }

        // 1. Fetch master jobs (unless skipped)
        const masterJobs = masterJobsWhere.id === 'skip'
            ? []
            : await prisma.generation_jobs.findMany({
                where: masterJobsWhere,
                orderBy: {
                    createdAt: 'desc',
                },
                take: 30,
                include: {
                    channels: true,
                    archetypes: true,
                },
            });

        // 2. Fetch variant jobs (unless filtered out)
        const variantJobsWhere: any = {
            generation_jobs: {
                userId: session.user.id
            }
        };

        // Apply status filter for variants
        if (statusFilter) {
            variantJobsWhere.status = statusFilter;
        }

        const variantJobs = typeFilter === 'single' || typeFilter === 'batch'
            ? [] // Skip variants if filtering for single or batch
            : await prisma.variant_jobs.findMany({
                where: variantJobsWhere,
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

        // 4. Map masterJobs to add channel/archetype aliases expected by frontend
        const mappedMasterJobs = (masterJobs as any[]).map(job => ({
            ...job,
            channel: job.channels,
            archetype: job.archetypes,
        }));

        // 5. Combine and sort
        const combined = [...mappedMasterJobs, ...mappedVariants]
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
