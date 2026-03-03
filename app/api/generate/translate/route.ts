import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
    const authResult = await getApiAuth(request as any);
    if (authResult.error || !authResult.user?.id) {
        return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
    }

    try {
        const body = await request.json();
        const { masterJobId, targetLanguages } = body;

        if (!masterJobId || !targetLanguages || !Array.isArray(targetLanguages)) {
            return NextResponse.json(
                { error: 'Missing required fields: masterJobId, targetLanguages (array)' },
                { status: 400 }
            );
        }

        // 1. Fetch the master job
        const masterJob = await prisma.generationJob.findUnique({
            where: { id: masterJobId },
            include: { channel: true, archetype: true }
        });

        if (!masterJob) {
            return NextResponse.json({ error: 'Master job not found' }, { status: 404 });
        }

        // 2. Spawn translation jobs (represented as VariantJob records)
        const variantPromises = targetLanguages.map(async (lang: string) => {
            return (prisma as any).variantJob.create({
                data: {
                    masterJobId: masterJob.id,
                    language: lang,
                    translatedText: masterJob.thumbnailText, // Placeholder for actual translation logic
                    status: 'pending'
                }
            });
        });

        const settledVariants = await Promise.allSettled(variantPromises);

        const successVariants = settledVariants
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
            .map(result => result.value);

        const failedCount = settledVariants.length - successVariants.length;
        const variants = successVariants;

        // Note: In a production environment, we would also trigger the actual generation 
        // for each variant here, likely reusing the master job's scene but with translated text.

        return NextResponse.json({
            message: `Successfully queued ${variants.length} translation variants`,
            variants
        }, { status: 201 });

    } catch (error: any) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to queue translation jobs' },
            { status: 500 }
        );
    }
}
