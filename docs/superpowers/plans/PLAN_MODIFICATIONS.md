# Plan Modifications for Local Storage Migration

**Date:** 2026-04-20

## User-Requested Changes

1. **Switch from R2 to local server storage**
   - Remove Cloudflare R2 dependencies
   - Store thumbnails on server filesystem
   - Serve via subdomain: thumbnails.schreinercontentsystems.com

2. **Automatic cleanup of old thumbnails**
   - Delete thumbnails older than 30 days
   - Implement cron job for cleanup

3. **Remove Resend API**
   - No longer using Resend for emails
   - Remove RESEND_API_KEY from .env

4. **Resolution set to 1K**
   - AI33 already configured for 1K resolution
   - Verify Google Gemini client configuration

## Changes to Implementation Plan

### Tech Stack (Line 9)
**Old:** `Next.js 15, Prisma 5, PostgreSQL 16, Redis 7, BullMQ, AI33 API, Google Gemini API, Google Sheets API, Cloudflare R2, Docker, systemd`
**New:** `Next.js 15, Prisma 5, PostgreSQL 16, Redis 7, BullMQ, AI33 API, Google Gemini API, Google Sheets API, Docker, systemd`

### New Files to Create
Add to line ~29:
```
lib/storage/local.ts                        # Local file storage with cleanup
```

### .env.example Changes

**Remove:**
```bash
# Cloudflare R2 Storage
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=thumbnails
R2_PUBLIC_URL=https://pub-your-account.r2.dev

# Email
RESEND_API_KEY=your_resend_api_key
```

**Add:**
```bash
# Storage
STORAGE_PATH=/opt/thumbnail-generator/storage/thumbnails
STORAGE_RETENTION_DAYS=30
```

### New Task 7b: Local Storage Implementation

Insert after Task 7 (Unified AI Generator Interface) and before Task 8:

**Create `lib/storage/local.ts`** with:
- `ensureStorageDirectory()` - creates storage directory
- `saveThumbnail(buffer, filename)` - saves to local filesystem
- `cleanupOldThumbnails()` - deletes files older than RETENTION_DAYS

**Create `scripts/cleanup-thumbnails.ts`** for cron:
- Calls `cleanupOldThumbnails()`
- Logs deleted count
- Exit codes for monitoring

### Task 8 Modifications (Queue Worker)

**Import changes:**
- Remove: `import { uploadToR2 } from '../storage/r2';`
- Add: `import { saveThumbnail } from '../storage/local';`
- Add: `import { readFile } from 'fs/promises';`

**Generation flow changes:**
```typescript
// OLD:
const outputUrl = await uploadToR2(result.buffer, `${jobId}.png`, 'thumbnails');

// NEW:
const outputUrl = await saveThumbnail(result.buffer, `${jobId}.png`);
```

**ZIP generation changes:**
```typescript
// OLD: Fetch from R2 URL
const imageResponse = await fetch(job.outputUrl!);
const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

// NEW: Read from local filesystem
const localPath = join(process.cwd(), job.outputUrl!);
const imageBuffer = await readFile(localPath);
```

```typescript
// OLD: Upload ZIP to R2
const zipBuffer = await require('fs/promises').readFile(zipPath);
const zipUrl = await uploadToR2(zipBuffer, `batch-${batchJobId}.zip`, 'thumbnails');

// NEW: Save ZIP locally
const zipBuffer = await readFile(zipPath);
const zipUrl = await saveThumbnail(zipBuffer, `batch-${batchJobId}.zip`);
```

### Task 20 Modifications (Production Setup)

**Update .env.example production notes:**
Add:
```bash
# 6. Create storage directory: mkdir -p /opt/thumbnail-generator/storage/thumbnails
#
# Storage:
# - Local filesystem at STORAGE_PATH
# - Thumbnails auto-delete after 30 days
# - Run cleanup via cron: 0 2 * * * cd /opt/thumbnail-generator && npm run cleanup
```

**Update DEPLOYMENT.md:**
Step 3 - Add storage directory creation:
```bash
mkdir -p /opt/thumbnail-generator/storage/thumbnails
```

Step 8 (new) - Setup cron for cleanup:
```bash
crontab -e
# Add: 0 2 * * * cd /opt/thumbnail-generator && npm run cleanup >> /var/log/thumbnail-cleanup.log 2>&1
```

Post-Deployment checklist - Update verification:
- Remove: "Verify R2 uploads"
- Add: "Verify local storage working"
- Add: "Test cleanup script: `npm run cleanup`"

## Nginx Configuration Note

Since thumbnails are stored locally at `/opt/thumbnail-generator/storage/thumbnails/`,
the subdomain `thumbnails.schreinercontentsystems.com` needs to serve these files.

**Add Nginx config** (not in original plan):
```nginx
server {
    listen 80;
    server_name thumbnails.schreinercontentsystems.com;

    location / {
        alias /opt/thumbnail-generator/storage/thumbnails/;
        autoindex off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

This allows URLs like:
`http://thumbnails.schreinercontentsystems.com/cm123abc.png`
to resolve to:
`/opt/thumbnail-generator/storage/thumbnails/cm123abc.png`

## Resolution Verification

**AI33 Client** (Task 5): Already set to `resolution: '1K'` ✓

**Google Client** (Task 6): Needs verification. Check if Nano Banana API supports resolution parameter. If so, add:
```typescript
imageGenerationConfig: {
  aspectRatio: "16:9",
  resolution: "1K"
}
```

## Summary

These changes eliminate external dependencies (R2, Resend) and simplify deployment while
adding automatic cleanup to prevent disk bloat. The subdomain serves files directly from
the server filesystem with proper caching headers.
