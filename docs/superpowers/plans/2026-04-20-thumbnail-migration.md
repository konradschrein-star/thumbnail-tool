# Thumbnail Generator Production Migration - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate YouTube Thumbnail Generator to production VPS with complete isolation, AI33+Google fallback, BullMQ queue system, and Google Sheets integration.

**Architecture:** Standalone Next.js 15 app with dedicated PostgreSQL and Redis instances. BullMQ queue for batch processing. AI33 as primary provider with Google Gemini fallback. Google Sheets OAuth for bulk imports.

**Tech Stack:** Next.js 15, Prisma 5, PostgreSQL 16, Redis 7, BullMQ, AI33 API, Google Gemini API, Google Sheets API, Cloudflare R2, Docker, systemd

---

## File Structure Overview

### New Files (to be created):
```
docker-compose.yml                          # PostgreSQL + Redis containers
.env.example                                # Environment template
worker.ts                                   # Queue worker entry point
lib/queue/connection.ts                     # BullMQ Redis connection
lib/queue/thumbnail-queue.ts                # Queue definition
lib/queue/worker.ts                         # Worker logic
lib/ai/ai33-client.ts                       # AI33 API client
lib/ai/image-generator.ts                   # Unified AI interface
lib/crypto.ts                               # OAuth token encryption
lib/sheets/oauth.ts                         # Google OAuth flow
lib/sheets/client.ts                        # Google Sheets API wrapper
lib/sheets/sync.ts                          # Sheet → BatchJob conversion
lib/storage/zip.ts                          # Batch ZIP generation
app/bulk/page.tsx                           # Bulk operations page
app/bulk/components/GoogleSheetsConnect.tsx # Google Sheets connection UI
app/bulk/components/SheetPreview.tsx        # Sheet preview component
app/bulk/components/BatchProgress.tsx       # Batch progress tracking
app/bulk/components/ManualUpload.tsx        # CSV/JSON upload
app/api/batch/create/route.ts               # Create batch job
app/api/batch/status/route.ts               # Poll batch status
app/api/batch/list/route.ts                 # List all batches
app/api/sheets/connect/route.ts             # OAuth initiation
app/api/sheets/callback/route.ts            # OAuth callback
app/api/sheets/sync/route.ts                # Import from sheet
app/api/sheets/preview/route.ts             # Preview sheet data
app/api/sheets/disconnect/route.ts          # Disconnect Google account
app/api/health/route.ts                     # Health check endpoint
app/api/queue/stats/route.ts                # Queue statistics
```

### Modified Files:
```
prisma/schema.prisma                        # Add BatchJob, GoogleSheetsConnection models
package.json                                # Add BullMQ, googleapis dependencies
next.config.js                              # Update port to 3072
lib/generation-service.ts                   # Rename to lib/ai/google-client.ts
app/api/generate/route.ts                   # Update to use new queue system
```

---

## Phase 1: Infrastructure & Database Foundation

### Task 1: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Create Docker Compose configuration**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: thumbnail-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: thumbnail_generator
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - thumbnail-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d thumbnail_generator"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    container_name: thumbnail-redis
    restart: unless-stopped
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy noeviction
      --appendonly yes
    ports:
      - "6380:6379"
    volumes:
      - thumbnail-redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  thumbnail-pgdata:
    name: thumbnail-pgdata
  thumbnail-redis:
    name: thumbnail-redis
```

- [ ] **Step 2: Create environment template**

```bash
# .env.example
# Node Environment
NODE_ENV=development
PORT=3072

# Database
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5433/thumbnail_generator

# Redis
REDIS_URL=redis://localhost:6380

# AI Providers
GOOGLE_API_KEY=your_google_api_key
AI33_API_KEY=your_ai33_api_key

# Cloudflare R2 Storage
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=thumbnails
R2_PUBLIC_URL=https://pub-your-account.r2.dev

# Authentication
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3072

# Email
RESEND_API_KEY=your_resend_api_key

# Google Sheets OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Encryption Key (for OAuth tokens)
ENCRYPTION_KEY=generate_with_openssl_rand_hex_32

# Docker
POSTGRES_PASSWORD=choose_strong_password
```

- [ ] **Step 3: Test Docker services locally**

Run: `docker compose up -d`
Expected: Both containers start with healthy status

Run: `docker compose ps`
Expected output:
```
NAME                 STATUS         PORTS
thumbnail-postgres   Up (healthy)   5433->5432/tcp
thumbnail-redis      Up (healthy)   6380->6379/tcp
```

- [ ] **Step 4: Commit infrastructure files**

```bash
git add docker-compose.yml .env.example
git commit -m "feat(infra): add Docker Compose for PostgreSQL and Redis

- PostgreSQL 16 on port 5433
- Redis 7 on port 6380
- Health checks and persistent volumes
- Complete isolation from Content Forge infrastructure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update datasource to PostgreSQL**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 2: Add new enum types**

```prisma
enum AIProvider {
  AI33
  GOOGLE
}

enum BatchStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  PARTIAL
}
```

- [ ] **Step 3: Extend GenerationJob model**

Add these fields to existing `GenerationJob` model:

```prisma
model GenerationJob {
  // ... existing fields ...

  // NEW: Batch processing fields
  batchJobId      String?
  batchJob        BatchJob?       @relation(fields: [batchJobId], references: [id], onDelete: SetNull)
  aiProvider      AIProvider      @default(AI33)
  fallbackUsed    Boolean         @default(false)
  fallbackReason  String?         @db.Text

  @@index([batchJobId])
}
```

- [ ] **Step 4: Add BatchJob model**

```prisma
model BatchJob {
  id              String          @id @default(cuid())
  userId          String?
  name            String
  status          BatchStatus     @default(PENDING)
  totalJobs       Int
  completedJobs   Int             @default(0)
  failedJobs      Int             @default(0)
  outputZipUrl    String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  jobs            GenerationJob[]

  @@index([status])
  @@index([userId])
}
```

- [ ] **Step 5: Add GoogleSheetsConnection model**

```prisma
model GoogleSheetsConnection {
  id              String          @id @default(cuid())
  userId          String          @unique
  accessToken     String          @db.Text
  refreshToken    String          @db.Text
  expiresAt       DateTime
  sheetId         String?
  sheetName       String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([userId])
}
```

- [ ] **Step 6: Generate Prisma client**

Run: `npx prisma generate`
Expected: Prisma Client generated successfully

- [ ] **Step 7: Create initial migration**

Run: `npx prisma migrate dev --name init_postgresql`
Expected: Migration created and applied

- [ ] **Step 8: Verify database schema**

Run: `docker compose exec postgres psql -U postgres -d thumbnail_generator -c "\dt"`
Expected: List of tables including BatchJob and GoogleSheetsConnection

- [ ] **Step 9: Commit schema changes**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): migrate to PostgreSQL with batch processing schema

- Switch from SQLite to PostgreSQL
- Add BatchJob model for bulk operations
- Add GoogleSheetsConnection for OAuth tokens
- Extend GenerationJob with AI provider tracking

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Package Dependencies

**Files:**
- Modify: `package.json`
- Modify: `next.config.js`

- [ ] **Step 1: Install BullMQ and Redis client**

Run: `npm install bullmq ioredis`
Expected: Dependencies installed successfully

- [ ] **Step 2: Install Google APIs client**

Run: `npm install googleapis`
Expected: googleapis@latest installed

- [ ] **Step 3: Install validation library**

Run: `npm install zod`
Expected: zod installed

- [ ] **Step 4: Install ZIP generation library**

Run: `npm install archiver @types/archiver`
Expected: archiver installed

- [ ] **Step 5: Update Next.js port in package.json**

```json
{
  "scripts": {
    "dev": "next dev -p 3072",
    "start": "next start -p 3072"
  }
}
```

- [ ] **Step 6: Update next.config.js port**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PORT: process.env.PORT || '3072',
  },
};

module.exports = nextConfig;
```

- [ ] **Step 7: Commit dependency changes**

```bash
git add package.json package-lock.json next.config.js
git commit -m "feat(deps): add BullMQ, googleapis, and supporting libraries

- BullMQ + ioredis for queue system
- googleapis for Google Sheets OAuth
- zod for input validation
- archiver for batch ZIP generation
- Update default port to 3072

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Queue System & AI Integration

### Task 4: BullMQ Queue Setup

**Files:**
- Create: `lib/queue/connection.ts`
- Create: `lib/queue/thumbnail-queue.ts`

- [ ] **Step 1: Create Redis connection**

```typescript
// lib/queue/connection.ts
import Redis from 'ioredis';

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log('✓ Redis connected');
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});
```

- [ ] **Step 2: Create thumbnail queue definition**

```typescript
// lib/queue/thumbnail-queue.ts
import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export interface ThumbnailJobData {
  jobId: string;
  batchJobId?: string;
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
}

export const thumbnailQueue = new Queue<ThumbnailJobData>('thumbnail-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

thumbnailQueue.on('error', (err) => {
  console.error('Queue error:', err);
});

console.log('✓ Thumbnail queue initialized');
```

- [ ] **Step 3: Test queue connection**

Create test file `test-queue.ts`:
```typescript
import { thumbnailQueue } from './lib/queue/thumbnail-queue';

async function test() {
  const job = await thumbnailQueue.add('test', {
    jobId: 'test-123',
    channelId: 'ch-1',
    archetypeId: 'arch-1',
    videoTopic: 'Test',
    thumbnailText: 'TEST',
  });

  console.log('Job added:', job.id);

  const waiting = await thumbnailQueue.getWaitingCount();
  console.log('Waiting jobs:', waiting);

  process.exit(0);
}

test();
```

Run: `tsx test-queue.ts`
Expected: Job added successfully, waiting count incremented

- [ ] **Step 4: Clean up test**

Run: `rm test-queue.ts`

- [ ] **Step 5: Commit queue setup**

```bash
git add lib/queue/
git commit -m "feat(queue): add BullMQ queue infrastructure

- Redis connection with retry strategy
- Thumbnail queue with exponential backoff
- Job retention policies (24h completed, 7d failed)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: AI33 Client Implementation

**Files:**
- Create: `lib/ai/ai33-client.ts`

- [ ] **Step 1: Create AI33 client**

```typescript
// lib/ai/ai33-client.ts
const AI33_BASE_URL = 'https://api.ai33.pro';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

export async function generateImageAI33(
  prompt: string,
  referenceImageUrls: string[]
): Promise<Buffer> {
  const AI33_API_KEY = process.env.AI33_API_KEY;
  if (!AI33_API_KEY) {
    throw new Error('AI33_API_KEY not configured');
  }

  // Download reference images
  console.log(`Downloading ${referenceImageUrls.length} reference images...`);
  const imageBuffers = await Promise.all(
    referenceImageUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch reference image: ${url}`);
      }
      return Buffer.from(await response.arrayBuffer());
    })
  );

  // Build multipart form data
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('model_id', 'gemini-3.1-flash-image-preview');
  formData.append('generations_count', '1');
  formData.append('model_parameters', JSON.stringify({
    aspect_ratio: '16:9',
    resolution: '2K',
  }));

  // Attach reference images
  imageBuffers.forEach((buffer, i) => {
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('assets', blob, `ref${i}.png`);
  });

  // Submit generation task
  console.log('Submitting AI33 generation task...');
  const submitResponse = await fetch(`${AI33_BASE_URL}/v1i/task/generate-image`, {
    method: 'POST',
    headers: {
      'xi-api-key': AI33_API_KEY,
    },
    body: formData,
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`AI33 submission failed: ${submitResponse.status} ${errorText}`);
  }

  const submitData = await submitResponse.json() as { success?: boolean; task_id?: string };
  if (!submitData.success || !submitData.task_id) {
    throw new Error(`AI33 submission failed: ${JSON.stringify(submitData)}`);
  }

  const taskId = submitData.task_id;
  console.log(`AI33 task submitted: ${taskId}`);

  // Poll for completion
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    const statusResponse = await fetch(`${AI33_BASE_URL}/v1/task/${taskId}`, {
      headers: {
        'xi-api-key': AI33_API_KEY,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`AI33 status check failed: ${statusResponse.status}`);
    }

    const task = await statusResponse.json() as {
      status: string;
      progress?: number;
      error_message?: string;
      metadata?: {
        result_images?: Array<{ imageUrl: string }>;
      };
    };

    console.log(`AI33 task ${taskId} - Status: ${task.status} (${task.progress || 0}%)`);

    if (task.status === 'done') {
      const imageUrl = task.metadata?.result_images?.[0]?.imageUrl;
      if (!imageUrl) {
        throw new Error('AI33 completed but no image URL in response');
      }

      console.log('Downloading generated image from AI33...');
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download AI33 image: ${imageResponse.status}`);
      }

      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      console.log(`✓ AI33 generation complete (${buffer.length} bytes)`);
      return buffer;
    }

    if (task.status === 'error') {
      throw new Error(`AI33 generation failed: ${task.error_message || 'Unknown error'}`);
    }
  }

  throw new Error(`AI33 generation timeout after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL / 1000}s`);
}
```

- [ ] **Step 2: Test AI33 client**

Create `test-ai33.ts`:
```typescript
import { generateImageAI33 } from './lib/ai/ai33-client';

async function test() {
  try {
    const buffer = await generateImageAI33(
      'A beautiful sunset over the ocean',
      []
    );
    console.log('Success! Generated:', buffer.length, 'bytes');
  } catch (error) {
    console.error('Test failed:', error);
  }
  process.exit(0);
}

test();
```

Run: `tsx test-ai33.ts`
Expected: Image generated successfully (or descriptive error if API key not configured)

- [ ] **Step 3: Clean up test**

Run: `rm test-ai33.ts`

- [ ] **Step 4: Commit AI33 client**

```bash
git add lib/ai/ai33-client.ts
git commit -m "feat(ai): add AI33 API client with polling

- Generate images via AI33 gateway
- Uses Nano Banana 2 (gemini-3.1-flash-image-preview)
- Polling strategy with 10-minute timeout
- Reference image support

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Move and Adapt Google Client

**Files:**
- Move: `lib/generation-service.ts` → `lib/ai/google-client.ts`
- Modify: `lib/ai/google-client.ts`

- [ ] **Step 1: Move file**

Run: `git mv lib/generation-service.ts lib/ai/google-client.ts`

- [ ] **Step 2: Simplify exports (keep only callNanoBanana)**

Remove exports for `initializeClient`, `handleAPIError`, and `saveOutputBuffer`. Keep only:

```typescript
export async function callNanoBanana(
  prompt: string,
  referenceImageUrls: string[]
): Promise<{ buffer: Buffer; fallbackUsed: boolean; fallbackMessage?: string }>
```

- [ ] **Step 3: Update function signature to accept URL strings**

Modify to fetch images from URLs instead of requiring pre-encoded images:

```typescript
export async function callNanoBanana(
  prompt: string,
  referenceImageUrls: string[]
): Promise<{ buffer: Buffer; fallbackUsed: boolean; fallbackMessage?: string }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

    // Download reference images
    const imageParts = await Promise.all(
      referenceImageUrls.map(async (url) => {
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'image/png'
          }
        };
      })
    );

    const primaryContent = {
      role: 'user',
      parts: [
        { text: prompt },
        ...imageParts
      ]
    };

    // ... rest of existing implementation with fallback chain
```

- [ ] **Step 4: Test Google client compatibility**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit Google client refactor**

```bash
git add lib/ai/google-client.ts
git commit -m "refactor(ai): adapt Google client for unified interface

- Move lib/generation-service.ts to lib/ai/google-client.ts
- Update to accept reference image URLs
- Simplify exports to only callNanoBanana
- Keep existing fallback chain logic

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Unified AI Generator Interface

**Files:**
- Create: `lib/ai/image-generator.ts`

- [ ] **Step 1: Create unified interface**

```typescript
// lib/ai/image-generator.ts
import { generateImageAI33 } from './ai33-client';
import { callNanoBanana } from './google-client';

export interface GenerationResult {
  buffer: Buffer;
  provider: 'AI33' | 'GOOGLE';
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export async function generateThumbnail(
  prompt: string,
  referenceImageUrls: string[]
): Promise<GenerationResult> {
  // Try AI33 first
  try {
    console.log('Attempting generation with AI33...');
    const buffer = await generateImageAI33(prompt, referenceImageUrls);

    return {
      buffer,
      provider: 'AI33',
      fallbackUsed: false,
    };
  } catch (ai33Error) {
    console.warn('AI33 failed, falling back to Google Gemini:', ai33Error);

    // Fallback to Google Gemini
    try {
      const result = await callNanoBanana(prompt, referenceImageUrls);

      return {
        buffer: result.buffer,
        provider: 'GOOGLE',
        fallbackUsed: true,
        fallbackReason: `AI33 error: ${ai33Error instanceof Error ? ai33Error.message : String(ai33Error)}`,
      };
    } catch (googleError) {
      // Both providers failed
      throw new Error(
        `Both AI33 and Google Gemini failed.\n` +
        `AI33: ${ai33Error instanceof Error ? ai33Error.message : String(ai33Error)}\n` +
        `Google: ${googleError instanceof Error ? googleError.message : String(googleError)}`
      );
    }
  }
}
```

- [ ] **Step 2: Test unified interface**

Create `test-generator.ts`:
```typescript
import { generateThumbnail } from './lib/ai/image-generator';

async function test() {
  try {
    const result = await generateThumbnail(
      'A modern tech thumbnail with bold text "TEST"',
      []
    );
    console.log('Success!');
    console.log('Provider:', result.provider);
    console.log('Fallback used:', result.fallbackUsed);
    console.log('Buffer size:', result.buffer.length);
  } catch (error) {
    console.error('Test failed:', error);
  }
  process.exit(0);
}

test();
```

Run: `tsx test-generator.ts`
Expected: Generation completes with AI33 or Google (depending on API availability)

- [ ] **Step 3: Clean up test**

Run: `rm test-generator.ts`

- [ ] **Step 4: Commit unified generator**

```bash
git add lib/ai/image-generator.ts
git commit -m "feat(ai): add unified generator with AI33→Google fallback

- Try AI33 first (cost-optimized)
- Automatic fallback to Google Gemini on AI33 failure
- Track which provider was used
- Comprehensive error messages when both fail

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Queue Worker Implementation

**Files:**
- Create: `lib/queue/worker.ts`
- Create: `worker.ts`

- [ ] **Step 1: Create worker logic**

```typescript
// lib/queue/worker.ts
import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import type { ThumbnailJobData } from './thumbnail-queue';
import { generateThumbnail } from '../ai/image-generator';
import { prisma } from '../db';
import { uploadToR2 } from '../storage/r2';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

async function processThumbnailJob(job: Job<ThumbnailJobData>) {
  const { jobId, batchJobId, channelId, archetypeId, videoTopic, thumbnailText, customPrompt } = job.data;

  console.log(`Processing job ${jobId} (${videoTopic})...`);

  // Fetch database records
  const [channel, archetype] = await Promise.all([
    prisma.channel.findUnique({ where: { id: channelId } }),
    prisma.archetype.findUnique({ where: { id: archetypeId } }),
  ]);

  if (!channel || !archetype) {
    throw new Error(`Channel or Archetype not found (channel: ${channelId}, archetype: ${archetypeId})`);
  }

  // Build prompt
  const fullPrompt = customPrompt ||
    `${channel.personaDescription}\n\n${archetype.layoutInstructions}\n\nVideo Topic: ${videoTopic}\nThumbnail Text: ${thumbnailText}`;

  // Generate image with fallback
  console.log(`Generating thumbnail for job ${jobId}...`);
  const result = await generateThumbnail(fullPrompt, [archetype.imageUrl]);

  // Upload to R2
  console.log(`Uploading to R2...`);
  const outputUrl = await uploadToR2(result.buffer, `${jobId}.png`, 'thumbnails');

  // Update database
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      outputUrl,
      aiProvider: result.provider,
      fallbackUsed: result.fallbackUsed,
      fallbackReason: result.fallbackReason,
    },
  });

  console.log(`✓ Job ${jobId} completed (provider: ${result.provider})`);

  // Update batch progress if part of batch
  if (batchJobId) {
    await updateBatchProgress(batchJobId);
  }
}

async function updateBatchProgress(batchJobId: string) {
  // Increment completed count
  await prisma.batchJob.update({
    where: { id: batchJobId },
    data: {
      completedJobs: { increment: 1 },
    },
  });

  // Check if batch is complete
  const batch = await prisma.batchJob.findUnique({
    where: { id: batchJobId },
    include: {
      jobs: {
        select: { status: true, outputUrl: true },
      },
    },
  });

  if (!batch) return;

  const allDone = batch.jobs.every(j => j.status === 'COMPLETED' || j.status === 'FAILED');

  if (allDone) {
    console.log(`Batch ${batchJobId} complete. Generating ZIP...`);

    // Generate ZIP of all successful thumbnails
    const successfulJobs = batch.jobs.filter(j => j.status === 'COMPLETED' && j.outputUrl);

    if (successfulJobs.length > 0) {
      const zipPath = join(tmpdir(), `batch-${batchJobId}.zip`);
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);

      // Download and add each thumbnail to ZIP
      for (let i = 0; i < successfulJobs.length; i++) {
        const job = successfulJobs[i];
        const imageResponse = await fetch(job.outputUrl!);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        archive.append(imageBuffer, { name: `thumbnail-${i + 1}.png` });
      }

      await archive.finalize();
      await new Promise((resolve) => output.on('close', resolve));

      // Upload ZIP to R2
      const zipBuffer = await require('fs/promises').readFile(zipPath);
      const zipUrl = await uploadToR2(zipBuffer, `batch-${batchJobId}.zip`, 'thumbnails');

      // Clean up temp file
      await unlink(zipPath);

      // Update batch with ZIP URL
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: {
          status: batch.failedJobs === 0 ? 'COMPLETED' : 'PARTIAL',
          outputZipUrl: zipUrl,
        },
      });

      console.log(`✓ Batch ${batchJobId} ZIP uploaded: ${zipUrl}`);
    } else {
      // All jobs failed
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { status: 'FAILED' },
      });
    }
  }
}

export function createWorker() {
  const worker = new Worker('thumbnail-generation', processThumbnailJob, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute
    },
  });

  worker.on('completed', (job) => {
    console.log(`✓ Job ${job.id} completed successfully`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`✗ Job ${job?.id} failed:`, err);

    if (job) {
      // Update database on failure
      await prisma.generationJob.update({
        where: { id: job.data.jobId },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
        },
      }).catch(console.error);

      // Update batch failure count
      if (job.data.batchJobId) {
        await prisma.batchJob.update({
          where: { id: job.data.batchJobId },
          data: {
            failedJobs: { increment: 1 },
          },
        }).catch(console.error);

        await updateBatchProgress(job.data.batchJobId);
      }
    }
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  return worker;
}
```

- [ ] **Step 2: Create worker entry point**

```typescript
// worker.ts
import 'dotenv/config';
import { createWorker } from './lib/queue/worker';

console.log('Starting thumbnail generation worker...');
console.log('Concurrency: 5');
console.log('Rate limit: 10 jobs/minute');

const worker = createWorker();

console.log('✓ Worker started, waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing worker...');
  await worker.close();
  process.exit(0);
});
```

- [ ] **Step 3: Add worker start script to package.json**

```json
{
  "scripts": {
    "worker": "tsx worker.ts",
    "worker:prod": "node worker.js"
  }
}
```

- [ ] **Step 4: Commit worker implementation**

```bash
git add lib/queue/worker.ts worker.ts package.json
git commit -m "feat(queue): add BullMQ worker for thumbnail generation

- Process jobs with concurrency: 5
- Rate limit: 10 jobs/minute
- Automatic batch ZIP generation on completion
- Comprehensive error handling and logging
- Graceful shutdown on SIGTERM/SIGINT

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Google Sheets Integration

### Task 9: Encryption Utilities

**Files:**
- Create: `lib/crypto.ts`

- [ ] **Step 1: Create encryption utilities**

```typescript
// lib/crypto.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

- [ ] **Step 2: Test encryption utilities**

Create `test-crypto.ts`:
```typescript
import { encrypt, decrypt, generateEncryptionKey } from './lib/crypto';

// Set test key
process.env.ENCRYPTION_KEY = generateEncryptionKey();

const original = 'sensitive-oauth-token-12345';
const encrypted = encrypt(original);
const decrypted = decrypt(encrypted);

console.log('Original:', original);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', original === decrypted ? '✓' : '✗');

process.exit(original === decrypted ? 0 : 1);
```

Run: `tsx test-crypto.ts`
Expected: Match: ✓

- [ ] **Step 3: Clean up test**

Run: `rm test-crypto.ts`

- [ ] **Step 4: Commit encryption utilities**

```bash
git add lib/crypto.ts
git commit -m "feat(crypto): add AES-256-GCM encryption for OAuth tokens

- Encrypt/decrypt functions for sensitive data
- Generate encryption keys with openssl
- Used for Google Sheets OAuth tokens in database

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Google Sheets OAuth Flow

**Files:**
- Create: `app/api/sheets/connect/route.ts`
- Create: `app/api/sheets/callback/route.ts`
- Create: `app/api/sheets/disconnect/route.ts`

- [ ] **Step 1: Create OAuth initiation endpoint**

```typescript
// app/api/sheets/connect/route.ts
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/sheets/callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    prompt: 'consent',
  });

  return NextResponse.redirect(authUrl);
}
```

- [ ] **Step 2: Create OAuth callback endpoint**

```typescript
// app/api/sheets/callback/route.ts
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const session = await getServerSession();

  if (!code || !session) {
    return NextResponse.redirect('/bulk?error=auth_failed');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/sheets/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      throw new Error('Incomplete tokens received from Google');
    }

    // Store encrypted tokens
    await prisma.googleSheetsConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date),
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date),
      },
    });

    return NextResponse.redirect('/bulk?connected=true');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect('/bulk?error=auth_failed');
  }
}
```

- [ ] **Step 3: Create disconnect endpoint**

```typescript
// app/api/sheets/disconnect/route.ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.googleSheetsConnection.delete({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // If record doesn't exist, that's fine
    return NextResponse.json({ success: true });
  }
}
```

- [ ] **Step 4: Commit OAuth endpoints**

```bash
git add app/api/sheets/
git commit -m "feat(sheets): add Google Sheets OAuth flow

- OAuth initiation endpoint
- OAuth callback with encrypted token storage
- Disconnect endpoint to revoke access
- Read-only spreadsheet scope

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Google Sheets Sync Logic

**Files:**
- Create: `app/api/sheets/preview/route.ts`
- Create: `app/api/sheets/sync/route.ts`

- [ ] **Step 1: Create sheet preview endpoint**

```typescript
// app/api/sheets/preview/route.ts
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheetId = request.nextUrl.searchParams.get('sheetId');
  if (!sheetId) {
    return NextResponse.json({ error: 'sheetId required' }, { status: 400 });
  }

  try {
    // Get stored OAuth tokens
    const connection = await prisma.googleSheetsConnection.findUnique({
      where: { userId: session.user.id },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Not connected to Google Sheets' }, { status: 400 });
    }

    // Initialize Google Sheets API client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: decrypt(connection.accessToken),
      refresh_token: decrypt(connection.refreshToken),
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Read sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A1:F1000',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Sheet is empty' }, { status: 400 });
    }

    // Parse header row
    const headers = rows[0].map(h => String(h).toLowerCase().replace(/\s+/g, '_'));
    const dataRows = rows.slice(1);

    // Convert to objects
    const parsedRows = dataRows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });

    // Filter pending rows
    const pendingRows = parsedRows.filter(row => row.status?.toLowerCase() === 'pending');

    return NextResponse.json({
      success: true,
      rows: pendingRows,
      total: pendingRows.length,
    });
  } catch (error) {
    console.error('Sheet preview error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to preview sheet'
    }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create sheet sync endpoint**

```typescript
// app/api/sheets/sync/route.ts
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { thumbnailQueue } from '@/lib/queue/thumbnail-queue';

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sheetId } = await request.json();
  if (!sheetId) {
    return NextResponse.json({ error: 'sheetId required' }, { status: 400 });
  }

  try {
    // Get stored OAuth tokens
    const connection = await prisma.googleSheetsConnection.findUnique({
      where: { userId: session.user.id },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Not connected to Google Sheets' }, { status: 400 });
    }

    // Initialize Google Sheets API client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: decrypt(connection.accessToken),
      refresh_token: decrypt(connection.refreshToken),
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Read sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A1:F1000',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Sheet is empty' }, { status: 400 });
    }

    // Parse header row
    const headers = rows[0].map(h => String(h).toLowerCase().replace(/\s+/g, '_'));
    const dataRows = rows.slice(1);

    // Convert to objects
    const parsedRows = dataRows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });

    // Filter pending rows
    const pendingRows = parsedRows.filter(row => row.status?.toLowerCase() === 'pending');

    if (pendingRows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending rows found',
        jobsQueued: 0
      });
    }

    // Create batch job
    const batchJob = await prisma.batchJob.create({
      data: {
        userId: session.user.id,
        name: `Google Sheets Import - ${new Date().toLocaleString()}`,
        status: 'PENDING',
        totalJobs: pendingRows.length,
      },
    });

    // Create generation jobs and queue them
    const jobs = [];
    for (const row of pendingRows) {
      const channelName = row.channel_name;
      const archetypeName = row.archetype_name;
      const videoTopic = row.video_topic;
      const thumbnailText = row.thumbnail_text;
      const customPrompt = row.custom_prompt;

      if (!channelName || !archetypeName || !videoTopic || !thumbnailText) {
        console.warn(`Skipping row with missing data:`, row);
        continue;
      }

      // Lookup channel and archetype IDs
      const [channel, archetype] = await Promise.all([
        prisma.channel.findFirst({ where: { name: channelName } }),
        prisma.archetype.findFirst({ where: { name: archetypeName } }),
      ]);

      if (!channel || !archetype) {
        console.warn(`Skipping row: Channel or Archetype not found (${channelName}, ${archetypeName})`);
        continue;
      }

      // Create generation job
      const job = await prisma.generationJob.create({
        data: {
          channelId: channel.id,
          archetypeId: archetype.id,
          videoTopic,
          thumbnailText,
          customPrompt: customPrompt || undefined,
          status: 'PROCESSING',
          batchJobId: batchJob.id,
        },
      });

      // Queue to BullMQ
      await thumbnailQueue.add('generate', {
        jobId: job.id,
        batchJobId: batchJob.id,
        channelId: channel.id,
        archetypeId: archetype.id,
        videoTopic,
        thumbnailText,
        customPrompt: customPrompt || undefined,
      });

      jobs.push(job);
    }

    // Update batch status
    await prisma.batchJob.update({
      where: { id: batchJob.id },
      data: {
        status: 'PROCESSING',
        totalJobs: jobs.length, // Update with actual queued count
      },
    });

    return NextResponse.json({
      success: true,
      batchJobId: batchJob.id,
      jobsQueued: jobs.length,
    });
  } catch (error) {
    console.error('Sheet sync error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to sync sheet'
    }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit sync endpoints**

```bash
git add app/api/sheets/
git commit -m "feat(sheets): add sheet preview and sync endpoints

- Preview endpoint shows pending rows
- Sync endpoint creates batch job and queues thumbnails
- Validates channel/archetype names against database
- Skips rows with missing or invalid data

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Bulk Operations UI

### Task 12: Batch API Endpoints

**Files:**
- Create: `app/api/batch/list/route.ts`
- Create: `app/api/batch/status/route.ts`

- [ ] **Step 1: Create batch list endpoint**

```typescript
// app/api/batch/list/route.ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const batches = await prisma.batchJob.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      batches,
    });
  } catch (error) {
    console.error('List batches error:', error);
    return NextResponse.json({
      error: 'Failed to list batches'
    }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create batch status endpoint**

```typescript
// app/api/batch/status/route.ts
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const batchId = request.nextUrl.searchParams.get('batchId');
  if (!batchId) {
    return NextResponse.json({ error: 'batchId required' }, { status: 400 });
  }

  try {
    const batch = await prisma.batchJob.findUnique({
      where: { id: batchId },
      include: {
        jobs: {
          select: {
            id: true,
            status: true,
            videoTopic: true,
            thumbnailText: true,
            outputUrl: true,
            errorMessage: true,
            aiProvider: true,
            fallbackUsed: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      batch,
    });
  } catch (error) {
    console.error('Batch status error:', error);
    return NextResponse.json({
      error: 'Failed to get batch status'
    }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit batch endpoints**

```bash
git add app/api/batch/
git commit -m "feat(batch): add batch list and status endpoints

- List all batches for current user
- Get detailed batch status with job breakdown
- Authorization checks for batch access

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Bulk Operations Page

**Files:**
- Create: `app/bulk/page.tsx`

- [ ] **Step 1: Create bulk page**

```tsx
// app/bulk/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleSheetsConnect } from './components/GoogleSheetsConnect';
import { SheetPreview } from './components/SheetPreview';
import { BatchProgress } from './components/BatchProgress';
import { ManualUpload } from './components/ManualUpload';

export default function BulkGeneratorPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bulk Thumbnail Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate hundreds of thumbnails from Google Sheets or CSV files
        </p>
      </div>

      <Tabs defaultValue="sheets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
          <TabsTrigger value="manual">Manual Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="sheets" className="space-y-6">
          <GoogleSheetsConnect />
          <SheetPreview />
          <BatchProgress />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <ManualUpload />
          <BatchProgress />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Test page routing**

Run: `npm run dev`
Navigate to: `http://localhost:3072/bulk`
Expected: Page renders without errors

- [ ] **Step 3: Commit bulk page**

```bash
git add app/bulk/page.tsx
git commit -m "feat(ui): add bulk operations page with tabbed interface

- Google Sheets tab for OAuth integration
- Manual Upload tab for CSV/JSON files
- Shared batch progress component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Google Sheets Connect Component

**Files:**
- Create: `app/bulk/components/GoogleSheetsConnect.tsx`

- [ ] **Step 1: Create component**

```tsx
// app/bulk/components/GoogleSheetsConnect.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

export function GoogleSheetsConnect() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check connection status
    // TODO: Implement GET /api/sheets/status endpoint
    setLoading(false);
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/sheets/connect';
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/sheets/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setConnected(false);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Google Sheets Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Google Sheets Integration</CardTitle>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Connected to Google Sheets</span>
            </div>
            <Button variant="outline" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Connect your Google account to import thumbnail requests from Google Sheets.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  We only request read-only access to your spreadsheets.
                </p>
              </div>
            </div>
            <Button onClick={handleConnect}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M19.5 2h-15C3.12 2 2 3.12 2 4.5v15C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-15C22 3.12 20.88 2 19.5 2zm-9 16h-4v-4h4v4zm0-5h-4V9h4v4zm0-5h-4V4h4v4zm5 10h-4v-4h4v4zm0-5h-4V9h4v4zm0-5h-4V4h4v4zm5 10h-4v-4h4v4zm0-5h-4V9h4v4zm0-5h-4V4h4v4z"
                />
              </svg>
              Connect Google Sheets
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add app/bulk/components/GoogleSheetsConnect.tsx
git commit -m "feat(ui): add Google Sheets connection component

- Connect/disconnect buttons
- Connection status indicator
- Google Sheets icon

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Sheet Preview Component

**Files:**
- Create: `app/bulk/components/SheetPreview.tsx`

- [ ] **Step 1: Create component**

```tsx
// app/bulk/components/SheetPreview.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface PreviewRow {
  channel_name: string;
  archetype_name: string;
  video_topic: string;
  thumbnail_text: string;
  status: string;
}

export function SheetPreview() {
  const [sheetId, setSheetId] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handlePreview = async () => {
    if (!sheetId.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/sheets/preview?sheetId=${encodeURIComponent(sheetId)}`);
      const data = await response.json();

      if (data.success) {
        setPreview(data.rows);
      } else {
        alert(data.error || 'Failed to preview sheet');
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sheetId.trim()) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Success! ${data.jobsQueued} thumbnails queued for generation.`);
        setPreview([]);
        setSheetId('');
      } else {
        alert(data.error || 'Failed to sync sheet');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync sheet');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Sheet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Google Sheets ID or URL"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
            />
            <Button onClick={handlePreview} disabled={loading || !sheetId.trim()}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Preview
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Paste the full Google Sheets URL or just the Sheet ID
          </p>

          {preview.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Preview (First 5 rows):</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Archetype</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Text</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.channel_name}</TableCell>
                        <TableCell>{row.archetype_name}</TableCell>
                        <TableCell>{row.video_topic}</TableCell>
                        <TableCell>{row.thumbnail_text}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'pending' ? 'secondary' : 'default'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found <strong>{preview.length}</strong> pending thumbnails
                </p>
                <Button onClick={handleGenerate} disabled={syncing}>
                  {syncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate All
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add app/bulk/components/SheetPreview.tsx
git commit -m "feat(ui): add sheet preview component

- Input for Google Sheets ID/URL
- Preview pending rows before generating
- Generate all button to queue batch

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 16: Batch Progress Component

**Files:**
- Create: `app/bulk/components/BatchProgress.tsx`

- [ ] **Step 1: Create component**

```tsx
// app/bulk/components/BatchProgress.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download } from 'lucide-react';

interface Batch {
  id: string;
  name: string;
  status: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  outputZipUrl: string | null;
  createdAt: string;
}

export function BatchProgress() {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    // Initial fetch
    fetchBatches();

    // Poll every 3 seconds
    const interval = setInterval(fetchBatches, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batch/list');
      const data = await response.json();

      if (data.success) {
        setBatches(data.batches);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'PARTIAL':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📦 Active Batches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {batches.map(batch => {
            const progress = batch.totalJobs > 0
              ? (batch.completedJobs / batch.totalJobs) * 100
              : 0;

            return (
              <div key={batch.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{batch.name}</h3>
                  <Badge variant={getStatusVariant(batch.status)}>
                    {batch.status}
                  </Badge>
                </div>

                <Progress value={progress} className="h-2" />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {batch.completedJobs} / {batch.totalJobs} completed
                    {batch.failedJobs > 0 && ` (${batch.failedJobs} failed)`}
                  </span>

                  {batch.outputZipUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={batch.outputZipUrl} download>
                        <Download className="w-4 h-4 mr-2" />
                        Download ZIP
                      </a>
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Created {new Date(batch.createdAt).toLocaleString()}
                </p>
              </div>
            );
          })}

          {batches.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No active batches. Create one by importing a Google Sheet or uploading a file.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add app/bulk/components/BatchProgress.tsx
git commit -m "feat(ui): add batch progress tracking component

- Real-time progress updates (3s polling)
- Progress bars and status badges
- Download ZIP button when complete
- Failed job count display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 17: Manual Upload Component (Stub)

**Files:**
- Create: `app/bulk/components/ManualUpload.tsx`

- [ ] **Step 1: Create placeholder component**

```tsx
// app/bulk/components/ManualUpload.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export function ManualUpload() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📂 Manual Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">
            CSV/JSON upload coming soon
          </p>
          <p className="text-sm text-muted-foreground">
            For now, use Google Sheets to import bulk thumbnail requests
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add app/bulk/components/ManualUpload.tsx
git commit -m "feat(ui): add manual upload placeholder component

- Placeholder for future CSV/JSON upload feature
- Directs users to Google Sheets for now

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Production Deployment

### Task 18: Health Check Endpoints

**Files:**
- Create: `app/api/health/route.ts`
- Create: `app/api/queue/stats/route.ts`

- [ ] **Step 1: Create health check endpoint**

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redisConnection } from '@/lib/queue/connection';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'healthy';
  } catch (error) {
    health.status = 'unhealthy';
    health.services.database = 'unhealthy';
  }

  try {
    // Check Redis
    await redisConnection.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.status = 'unhealthy';
    health.services.redis = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
```

- [ ] **Step 2: Create queue stats endpoint**

```typescript
// app/api/queue/stats/route.ts
import { NextResponse } from 'next/server';
import { thumbnailQueue } from '@/lib/queue/thumbnail-queue';

export async function GET() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      thumbnailQueue.getWaitingCount(),
      thumbnailQueue.getActiveCount(),
      thumbnailQueue.getCompletedCount(),
      thumbnailQueue.getFailedCount(),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get queue stats',
    }, { status: 500 });
  }
}
```

- [ ] **Step 3: Test health endpoint**

Run: `npm run dev`
Run: `curl http://localhost:3072/api/health`
Expected: `{"status":"healthy",...}`

- [ ] **Step 4: Commit health endpoints**

```bash
git add app/api/health/ app/api/queue/
git commit -m "feat(ops): add health check and queue stats endpoints

- Health endpoint checks database and Redis connectivity
- Queue stats endpoint shows job counts
- Used for monitoring and alerting

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 19: Update Existing Generate Endpoint

**Files:**
- Modify: `app/api/generate/route.ts`

- [ ] **Step 1: Update to use queue system**

Find the section where it currently calls the generation service directly and replace with queue submission:

```typescript
// After creating GenerationJob in database...

// Queue the job instead of generating immediately
await thumbnailQueue.add('generate', {
  jobId: job.id,
  channelId: job.channelId,
  archetypeId: job.archetypeId,
  videoTopic: job.videoTopic,
  thumbnailText: job.thumbnailText,
  customPrompt: job.customPrompt || undefined,
});

return NextResponse.json({
  success: true,
  job: {
    id: job.id,
    status: job.status,
    message: 'Thumbnail generation queued',
  },
});
```

- [ ] **Step 2: Add polling instructions to response**

Update response to inform client to poll for status:

```typescript
return NextResponse.json({
  success: true,
  job: {
    id: job.id,
    status: job.status,
    message: 'Thumbnail generation queued. Poll GET /api/generate/status?jobId={id} for updates.',
  },
});
```

- [ ] **Step 3: Create status polling endpoint**

Create `app/api/generate/status/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      outputUrl: true,
      errorMessage: true,
      aiProvider: true,
      fallbackUsed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, job });
}
```

- [ ] **Step 4: Commit queue integration**

```bash
git add app/api/generate/
git commit -m "refactor(api): update generate endpoint to use queue system

- Queue jobs instead of synchronous generation
- Add status polling endpoint
- Return job ID for status tracking

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 20: Production Environment Setup

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update .env.example with production notes**

Add comments for production deployment:

```bash
# .env.example
# ====================
# PRODUCTION DEPLOYMENT NOTES
# ====================
# 1. Generate ENCRYPTION_KEY: openssl rand -hex 32
# 2. Generate NEXTAUTH_SECRET: openssl rand -base64 32
# 3. Update NEXTAUTH_URL to production domain
# 4. Set strong POSTGRES_PASSWORD
# 5. Configure Google OAuth credentials at https://console.cloud.google.com/
#
# Port Configuration:
# - PORT=3072 (Next.js)
# - PostgreSQL: 5433
# - Redis: 6380
#
# Complete isolation from Content Forge (ports 3000, 5432, 6379)
```

- [ ] **Step 2: Create deployment checklist**

Create `DEPLOYMENT.md`:
```markdown
# Deployment Checklist

## Pre-Deployment

- [ ] All tests passing locally
- [ ] Docker services running locally
- [ ] Environment variables configured in `.env`
- [ ] Database migrations applied
- [ ] Worker tested locally

## Server Setup

- [ ] SSH access configured
- [ ] Docker installed
- [ ] Node.js 22 installed
- [ ] Project directory created: `/opt/thumbnail-generator`

## Deployment Steps

1. **Transfer codebase:**
   ```bash
   tar --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='.next' -czf thumbnail.tar.gz .
   scp -i content-forge-key thumbnail.tar.gz root@65.108.6.149:/opt/thumbnail-generator/
   ```

2. **Extract and install:**
   ```bash
   ssh -i content-forge-key root@65.108.6.149
   cd /opt/thumbnail-generator
   tar -xzf thumbnail.tar.gz
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   nano .env  # Fill in production values
   ```

4. **Start infrastructure:**
   ```bash
   docker compose up -d
   docker compose ps  # Verify healthy
   ```

5. **Run migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

6. **Build application:**
   ```bash
   npm run build
   ```

7. **Setup systemd services:**
   - Copy service files to `/etc/systemd/system/`
   - `systemctl daemon-reload`
   - `systemctl enable thumbnail-dashboard thumbnail-worker`
   - `systemctl start thumbnail-dashboard thumbnail-worker`

8. **Verify services:**
   ```bash
   systemctl status thumbnail-dashboard
   systemctl status thumbnail-worker
   curl http://localhost:3072/api/health
   ```

## Post-Deployment

- [ ] Health check returns 200
- [ ] Worker logs show "waiting for jobs"
- [ ] Test single thumbnail generation
- [ ] Test batch generation
- [ ] Verify R2 uploads
```

- [ ] **Step 3: Commit deployment docs**

```bash
git add .env.example DEPLOYMENT.md
git commit -m "docs: add production deployment checklist and env notes

- Deployment step-by-step guide
- Environment variable documentation
- Port configuration notes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Implementation Complete!

This plan provides bite-sized tasks for migrating the Thumbnail Generator to production. Each task is self-contained with exact code, commands, and expected outputs.

**Next Steps:**
1. Execute tasks sequentially using superpowers:executing-plans skill
2. Test each phase before moving to the next
3. Deploy to production server following DEPLOYMENT.md

**Key Milestones:**
- ✅ Phase 1: Infrastructure running (PostgreSQL + Redis)
- ✅ Phase 2: Queue system functional (worker processing jobs)
- ✅ Phase 3: Google Sheets OAuth working
- ✅ Phase 4: UI components rendering
- ✅ Phase 5: Production deployment complete
