import { promises as fs } from 'fs';
import { join } from 'path';

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
