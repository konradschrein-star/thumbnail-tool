/**
 * Local File Storage for Thumbnails
 * Manages thumbnail storage on server filesystem with automatic cleanup
 *
 * Storage Structure:
 *   - Files stored at: ${STORAGE_PATH}/thumbnails/{filename}
 *   - URLs returned as: /storage/thumbnails/{filename}
 *   - Automatic cleanup of files older than STORAGE_RETENTION_DAYS
 */

import { promises as fs } from 'fs';
import { resolve, dirname, basename } from 'path';

export interface StorageConfig {
  storagePath: string; // Base directory for storage (e.g., /opt/thumbnail-generator/storage)
  retentionDays: number; // Days to keep thumbnails before cleanup (default: 30)
}

/**
 * Local file storage backend
 */
export class LocalStorage {
  private storagePath: string;
  private thumbnailPath: string;
  private retentionDays: number;

  constructor(config: StorageConfig) {
    if (!config.storagePath) {
      throw new Error('storagePath is required for LocalStorage');
    }

    this.storagePath = config.storagePath;
    this.thumbnailPath = resolve(this.storagePath, 'thumbnails');
    this.retentionDays = config.retentionDays || 30;

    console.log(`📁 Local storage initialized at: ${this.thumbnailPath}`);
    console.log(`   Retention period: ${this.retentionDays} days`);
  }

  /**
   * Save thumbnail image to local storage
   * @param buffer - Image data buffer
   * @param filename - Filename (without path), e.g., "cm123abc456.png"
   * @returns URL path to access the thumbnail, e.g., "/storage/thumbnails/cm123abc456.png"
   */
  async saveThumbnail(buffer: Buffer, filename: string): Promise<string> {
    try {
      // Ensure thumbnail directory exists
      await fs.mkdir(this.thumbnailPath, { recursive: true });

      // Full file path
      const filePath = resolve(this.thumbnailPath, filename);

      // Validate filename to prevent directory traversal
      if (!filePath.startsWith(this.thumbnailPath)) {
        throw new Error(`Invalid filename: ${filename}`);
      }

      // Write buffer to file
      await fs.writeFile(filePath, buffer);

      const url = `/storage/thumbnails/${filename}`;
      console.log(`   ✓ Saved thumbnail: ${url} (${(buffer.length / 1024).toFixed(1)}KB)`);

      return url;
    } catch (error) {
      throw new Error(
        `Failed to save thumbnail to local storage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if a thumbnail exists in storage
   * @param filename - Filename to check
   * @returns true if file exists, false otherwise
   */
  async thumbnailExists(filename: string): Promise<boolean> {
    try {
      const filePath = resolve(this.thumbnailPath, filename);

      // Validate filename
      if (!filePath.startsWith(this.thumbnailPath)) {
        return false;
      }

      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   * @param filename - Filename to check
   * @returns File stats or null if not found
   */
  async getThumbnailMetadata(filename: string): Promise<{ size: number; mtime: Date } | null> {
    try {
      const filePath = resolve(this.thumbnailPath, filename);

      // Validate filename
      if (!filePath.startsWith(this.thumbnailPath)) {
        return null;
      }

      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete a specific thumbnail
   * @param filename - Filename to delete
   * @returns true if deleted, false if not found
   */
  async deleteThumbnail(filename: string): Promise<boolean> {
    try {
      const filePath = resolve(this.thumbnailPath, filename);

      // Validate filename
      if (!filePath.startsWith(this.thumbnailPath)) {
        throw new Error(`Invalid filename: ${filename}`);
      }

      await fs.unlink(filePath);
      console.log(`   ✓ Deleted old thumbnail: ${filename}`);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false; // File not found
      }

      throw new Error(
        `Failed to delete thumbnail: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clean up old thumbnails based on retention policy
   * Deletes all files older than retentionDays
   * @returns Number of files deleted
   */
  async cleanupOldThumbnails(): Promise<number> {
    try {
      console.log('🧹 Starting thumbnail cleanup...');

      // Ensure directory exists
      try {
        await fs.mkdir(this.thumbnailPath, { recursive: true });
      } catch {
        // Directory doesn't exist yet, nothing to clean
        return 0;
      }

      const files = await fs.readdir(this.thumbnailPath);
      const now = Date.now();
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const filename of files) {
        try {
          const filePath = resolve(this.thumbnailPath, filename);
          const stats = await fs.stat(filePath);

          const ageMs = now - stats.mtime.getTime();

          if (ageMs > retentionMs) {
            await fs.unlink(filePath);
            const ageDays = (ageMs / (24 * 60 * 60 * 1000)).toFixed(1);
            console.log(`   ✓ Deleted old thumbnail: ${filename} (${ageDays} days old)`);
            deletedCount++;
          }
        } catch (error) {
          console.warn(
            `   ⚠️ Failed to process file ${filename}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      console.log(
        `✓ Cleanup complete: ${deletedCount} file(s) deleted (retention: ${this.retentionDays} days)`
      );

      return deletedCount;
    } catch (error) {
      throw new Error(
        `Failed to cleanup old thumbnails: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get storage statistics
   * @returns Object with usage information
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
    oldestFile?: { name: string; age: number };
    newestFile?: { name: string; age: number };
  }> {
    try {
      try {
        await fs.mkdir(this.thumbnailPath, { recursive: true });
      } catch {
        // Directory doesn't exist
        return { totalSize: 0, fileCount: 0 };
      }

      const files = await fs.readdir(this.thumbnailPath);
      let totalSize = 0;
      let oldestFile: { name: string; mtime: number } | undefined;
      let newestFile: { name: string; mtime: number } | undefined;

      const now = Date.now();

      for (const filename of files) {
        try {
          const filePath = resolve(this.thumbnailPath, filename);
          const stats = await fs.stat(filePath);

          totalSize += stats.size;

          if (!oldestFile || stats.mtime.getTime() < oldestFile.mtime) {
            oldestFile = { name: filename, mtime: stats.mtime.getTime() };
          }

          if (!newestFile || stats.mtime.getTime() > newestFile.mtime) {
            newestFile = { name: filename, mtime: stats.mtime.getTime() };
          }
        } catch {
          // Skip files we can't stat
        }
      }

      return {
        totalSize,
        fileCount: files.length,
        oldestFile: oldestFile
          ? { name: oldestFile.name, age: now - oldestFile.mtime }
          : undefined,
        newestFile: newestFile
          ? { name: newestFile.name, age: now - newestFile.mtime }
          : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to get storage stats: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Factory function using environment variables
 */
export function createLocalStorage(): LocalStorage {
  const storagePath = process.env.STORAGE_PATH;
  if (!storagePath) {
    throw new Error('STORAGE_PATH environment variable is required');
  }

  const retentionDays = process.env.STORAGE_RETENTION_DAYS
    ? parseInt(process.env.STORAGE_RETENTION_DAYS, 10)
    : 30;

  if (isNaN(retentionDays) || retentionDays < 1) {
    throw new Error('STORAGE_RETENTION_DAYS must be a positive integer');
  }

  return new LocalStorage({
    storagePath,
    retentionDays,
  });
}
