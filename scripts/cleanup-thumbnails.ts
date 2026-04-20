#!/usr/bin/env ts-node
/**
 * Thumbnail Cleanup Cron Script
 * Removes old thumbnail files from storage based on retention policy
 *
 * Usage:
 *   npx ts-node scripts/cleanup-thumbnails.ts
 *
 * Environment Variables:
 *   STORAGE_PATH - Base storage directory
 *   STORAGE_RETENTION_DAYS - Days to retain files (default: 30)
 *
 * Deploy as cron job:
 *   # Run daily at 2 AM
 *   0 2 * * * cd /app && npx ts-node scripts/cleanup-thumbnails.ts >> /var/log/thumbnail-cleanup.log 2>&1
 */

import { createLocalStorage } from '../lib/storage/local';

async function main() {
  console.log('Starting thumbnail cleanup process...\n');

  try {
    // Validate environment
    if (!process.env.STORAGE_PATH) {
      throw new Error('STORAGE_PATH environment variable is not set');
    }

    // Initialize storage
    const storage = createLocalStorage();

    // Get pre-cleanup stats
    console.log('📊 Storage stats before cleanup:');
    const beforeStats = await storage.getStorageStats();
    console.log(`   Total files: ${beforeStats.fileCount}`);
    console.log(`   Total size: ${(beforeStats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    if (beforeStats.oldestFile) {
      const ageDays = (beforeStats.oldestFile.age / (24 * 60 * 60 * 1000)).toFixed(1);
      console.log(`   Oldest file: ${beforeStats.oldestFile.name} (${ageDays} days old)`);
    }
    console.log('');

    // Run cleanup
    const deletedCount = await storage.cleanupOldThumbnails();
    console.log('');

    // Get post-cleanup stats
    console.log('📊 Storage stats after cleanup:');
    const afterStats = await storage.getStorageStats();
    console.log(`   Total files: ${afterStats.fileCount}`);
    console.log(`   Total size: ${(afterStats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    if (afterStats.oldestFile) {
      const ageDays = (afterStats.oldestFile.age / (24 * 60 * 60 * 1000)).toFixed(1);
      console.log(`   Oldest file: ${afterStats.oldestFile.name} (${ageDays} days old)`);
    }
    console.log('');

    console.log(`✓ Cleanup successful: ${deletedCount} file(s) removed`);
    console.log(`Freed space: ${((beforeStats.totalSize - afterStats.totalSize) / 1024 / 1024).toFixed(2)}MB`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Cleanup failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error('Please check:');
    console.error('  1. STORAGE_PATH environment variable is set');
    console.error('  2. Storage directory has read/write permissions');
    console.error('  3. STORAGE_RETENTION_DAYS is a valid integer (optional, default: 30)');

    process.exit(1);
  }
}

// Run with error handling
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
