import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Simple database backup script
 * Copies the SQLite database to a backups directory with timestamp
 */
async function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const dbPath = join(process.cwd(), 'prisma', 'dev.db');
    const backupDir = join(process.cwd(), 'backups');
    const backupPath = join(backupDir, `db-${timestamp}.db`);

    // Check if database exists
    if (!existsSync(dbPath)) {
      console.error('❌ Database file not found:', dbPath);
      process.exit(1);
    }

    // Create backups directory if it doesn't exist
    if (!existsSync(backupDir)) {
      await mkdir(backupDir, { recursive: true });
      console.log('✓ Created backups directory');
    }

    // Copy database file
    await copyFile(dbPath, backupPath);

    const stats = await import('fs').then(fs => fs.statSync(backupPath));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`✓ Database backed up successfully!`);
    console.log(`  From: ${dbPath}`);
    console.log(`  To: ${backupPath}`);
    console.log(`  Size: ${sizeMB} MB`);
    console.log(`  Date: ${new Date().toLocaleString()}`);

    // Clean up old backups (keep last 7 days)
    await cleanOldBackups(backupDir);
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

async function cleanOldBackups(backupDir: string) {
  try {
    const fs = await import('fs/promises');
    const files = await fs.readdir(backupDir);
    const dbFiles = files.filter((f) => f.startsWith('db-') && f.endsWith('.db'));

    // Sort by date (newest first)
    dbFiles.sort().reverse();

    // Keep last 7 backups
    const filesToDelete = dbFiles.slice(7);

    if (filesToDelete.length > 0) {
      console.log(`\n🗑️  Cleaning up old backups (keeping last 7)...`);
      for (const file of filesToDelete) {
        await fs.unlink(join(backupDir, file));
        console.log(`  Deleted: ${file}`);
      }
    }
  } catch (error: any) {
    console.error('Warning: Failed to clean old backups:', error.message);
  }
}

// Run backup
backupDatabase();
