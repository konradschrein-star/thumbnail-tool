import { NextRequest, NextResponse } from 'next/server';
import { cleanupTemporaryTranslations } from '@/lib/cleanup-service';

/**
 * GET /api/cron/cleanup-translate
 *
 * Automated cleanup endpoint for temporary translation files.
 * Called daily by Vercel Cron to delete files older than 24 hours.
 *
 * Protected by CRON_SECRET environment variable.
 *
 * Vercel cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-translate",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.warn('[CRON] Unauthorized cleanup attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Starting scheduled translation cleanup...');

    // Clean up files older than 24 hours
    const cleanedCount = await cleanupTemporaryTranslations(24);

    console.log(`[CRON] Cleanup complete. Deleted ${cleanedCount} temporary files.`);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      filesDeleted: cleanedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CRON] Cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Cleanup failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
