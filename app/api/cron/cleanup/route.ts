import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as r2Service from '@/lib/r2-service';

// This route should be called by a CRON job (e.g. Vercel Cron)
// Protected by a secret token in the header or URL params
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // POLICY: Delete manual generation jobs for non-admin users that are older than the last 30 items
        // Step 1: Find all non-admin users
        const nonAdmins = await (prisma.user as any).findMany({
            where: { role: 'USER' },
            select: { id: true },
        });

        let deletedCount = 0;

        for (const user of nonAdmins) {
            // Find jobs for this user beyond the top 30
            const jobsToKeep = await (prisma.generationJob as any).findMany({
                where: { userId: user.id, isManual: true },
                orderBy: { createdAt: 'desc' },
                take: 30,
                select: { id: true },
            });

            const keepIds = jobsToKeep.map((j: any) => j.id);

            const jobsToDelete = await (prisma.generationJob as any).findMany({
                where: {
                    userId: user.id,
                    isManual: true,
                    id: { notIn: keepIds },
                },
                select: { id: true, outputUrl: true },
            });

            if (jobsToDelete.length > 0) {
                for (const job of jobsToDelete) {
                    // Delete from R2 if URL exists
                    if (job.outputUrl) {
                        try {
                            // Extract the key from the URL
                            // Robust extraction: get everything after the domain
                            const url = new URL(job.outputUrl);
                            const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;

                            if (key && key !== '/') {
                                await r2Service.deleteFromR2(key);
                            }
                        } catch (r2Error) {
                            console.error(`Failed to delete R2 asset for job ${job.id}:`, r2Error);
                        }
                    }

                    // Delete variants first (due to FK constraints if any, though Prisma handles it)
                    await prisma.variantJob.deleteMany({
                        where: { masterJobId: job.id },
                    });

                    // Delete from DB
                    await prisma.generationJob.delete({
                        where: { id: job.id },
                    });

                    deletedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cleaned up ${deletedCount} generation jobs for non-admin users.`,
        });
    } catch (error: any) {
        console.error('Cleanup error:', error);
        return NextResponse.json(
            { error: error.message || 'Cleanup failed' },
            { status: 500 }
        );
    }
}
