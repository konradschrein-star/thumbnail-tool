import { promises as fs } from 'fs';
import { join } from 'path';
import { prisma } from './prisma';
import { deleteFromR2 } from './r2-service';

/**
 * Cleanup Service
 * Manages the purging of aging assets to prevent storage bloat.
 * Target: Files older than 48 hours in specific output/temporary directories.
 */

const CLEANUP_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

const TARGET_DIRECTORIES = [
    'public/output',
    'assets/temp', // Example temp dir if used
];

export async function purgeOldAssets() {
    console.log('[CLEANUP] Starting scheduled asset purge...');
    let purgedCount = 0;
    const now = Date.now();

    for (const dir of TARGET_DIRECTORIES) {
        try {
            const absoluteDir = join(process.cwd(), dir);

            // Ensure directory exists
            try {
                await fs.access(absoluteDir);
            } catch {
                continue; // Skip if directory doesn't exist
            }

            const files = await fs.readdir(absoluteDir);

            for (const file of files) {
                const filePath = join(absoluteDir, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtimeMs > CLEANUP_THRESHOLD_MS) {
                    await fs.unlink(filePath);
                    purgedCount++;
                }
            }
        } catch (error) {
            console.error(`[CLEANUP] Error cleaning directory ${dir}:`, error);
        }
    }

    console.log(`[CLEANUP] Finished. Purged ${purgedCount} files.`);
    return purgedCount;
}

/**
 * Cleanup Temporary Translation Files
 *
 * Removes temporary files from uploaded image translations that are older than a specified threshold.
 * This prevents R2 storage bloat from temporary translation uploads.
 *
 * @param olderThanHours - Files older than this many hours will be deleted (default: 24)
 * @returns Number of files cleaned up
 */
export async function cleanupTemporaryTranslations(olderThanHours: number = 24): Promise<number> {
  console.log(`[CLEANUP] Starting temporary translation cleanup (older than ${olderThanHours}h)...`);

  const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  let cleanedCount = 0;

  try {
    // Find old VariantJobs with uploaded images
    const oldVariants = await (prisma as any).variantJob.findMany({
      where: {
        translationMode: 'UPLOADED_IMAGE',
        createdAt: { lt: cutoffDate },
        sourceImageUrl: { not: null }
      }
    });

    console.log(`   Found ${oldVariants.length} old translation variants to clean`);

    for (const variant of oldVariants) {
      try {
        // Delete source image from R2 if it's in the translate-temp folder
        if (variant.sourceImageUrl?.includes('translate-temp/')) {
          const key = variant.sourceImageUrl.replace('/api/assets/', '');

          try {
            await deleteFromR2(key);
            console.log(`   ✓ Deleted temp file: ${key}`);
            cleanedCount++;
          } catch (deleteError: any) {
            // File might already be deleted - that's okay
            if (!deleteError.message?.includes('NotFound')) {
              console.warn(`   ⚠️ Failed to delete ${key}:`, deleteError.message);
            }
          }
        }

        // Also delete the generated output if it exists
        if (variant.outputUrl) {
          const outputKey = variant.outputUrl.replace('/api/assets/', '');

          try {
            await deleteFromR2(outputKey);
            console.log(`   ✓ Deleted output: ${outputKey}`);
          } catch (deleteError: any) {
            if (!deleteError.message?.includes('NotFound')) {
              console.warn(`   ⚠️ Failed to delete output ${outputKey}:`, deleteError.message);
            }
          }
        }

        // Optionally: Delete the VariantJob record itself
        // await prisma.variantJob.delete({ where: { id: variant.id } });
      } catch (err: any) {
        console.error(`   ✗ Cleanup failed for variant ${variant.id}:`, err.message);
      }
    }

    console.log(`[CLEANUP] Temporary translation cleanup complete. Deleted ${cleanedCount} files.`);
    return cleanedCount;
  } catch (error: any) {
    console.error('[CLEANUP] Temporary translation cleanup error:', error);
    throw error;
  }
}
