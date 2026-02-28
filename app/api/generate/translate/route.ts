import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        const variants = await Promise.all(targetLanguages.map(async (lang: string) => {
            return (prisma as any).variantJob.create({
                data: {
                    masterJobId: masterJob.id,
                    language: lang,
                    translatedText: masterJob.thumbnailText, // Placeholder for actual translation logic
                    status: 'pending'
                }
            });
        }));

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
