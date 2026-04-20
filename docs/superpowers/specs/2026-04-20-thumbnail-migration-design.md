# Thumbnail Generator - Production Migration Design
**Date:** 2026-04-20
**Status:** Approved
**Author:** Claude (Architecture)

## Executive Summary

Migrate the YouTube Thumbnail Generator from Vercel to production VPS with complete isolation from existing Content Forge infrastructure. Add mass production capabilities via Google Sheets integration and batch processing queue system. Switch primary AI provider from Google Gemini to AI33 with Google as fallback for cost optimization and stability.

**Key Goals:**
- ✅ Complete isolation - no shared services with Content Forge
- ✅ Production-ready deployment on existing VPS
- ✅ Google Sheets integration for VA workflow
- ✅ Batch processing with BullMQ queue
- ✅ AI33 primary + Google Gemini fallback
- ✅ Easy migration to separate server in future

---

## Architecture Overview

### System Boundaries

**Deployment:**
- Server: Hetzner VPS 65.108.6.149 (shared hardware, isolated services)
- Directory: `/opt/thumbnail-generator`
- Complete service isolation from `/opt/content-forge`

**Rationale:** Client is ready for production deployment. Using existing VPS for cost efficiency while maintaining clean separation allows future migration to dedicated server without code changes.

---

## Infrastructure & Ports

### Port Allocation

```
Production VPS Port Map:
┌──────────────────────────────────────────┐
│ Content Forge (existing):                │
│   - 3000: hub-web dashboard              │
│   - 5432: PostgreSQL                     │
│   - 6379: Redis                          │
├──────────────────────────────────────────┤
│ Thumbnail Generator (new):               │
│   - 3072: Next.js Dashboard              │
│   - 5433: PostgreSQL (dedicated)         │
│   - 6380: Redis (dedicated)              │
└──────────────────────────────────────────┘
```

**Port Selection Rationale:**
- 3072: Next avoids conflicts with Content Forge (3000) and dev env (3071)
- 5433: Standard PostgreSQL alternate port
- 6380: Standard Redis alternate port
- All ports isolated via Docker container networking

### Docker Compose Configuration

**File:** `docker-compose.yml`

```yaml
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

**Design Decisions:**
- **Alpine images:** Minimal attack surface, smaller disk footprint
- **Named volumes:** Persistent data across container restarts
- **Health checks:** Ensure services ready before dependent processes start
- **Memory limits:** Redis capped at 512MB (adequate for queue metadata)
- **AOF persistence:** Redis data survives crashes

---

## Application Architecture

### Directory Structure

```
thumbnail-generator/
├── docker-compose.yml              # Infrastructure services
├── .env                            # Environment configuration
├── .env.example                    # Template for deployment
├── package.json                    # Dependencies
├── next.config.js                  # Next.js 15 configuration
├── tsconfig.json                   # TypeScript configuration
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Migration history
│   └── seed.ts                    # Initial data
├── app/                           # Next.js 15 App Router
│   ├── dashboard/                 # Existing: Single generation UI
│   ├── bulk/                      # NEW: Mass production page
│   │   ├── page.tsx              # Main bulk interface
│   │   └── components/
│   │       ├── GoogleSheetsConnect.tsx
│   │       ├── SheetPreview.tsx
│   │       ├── BatchProgress.tsx
│   │       └── ManualUpload.tsx
│   └── api/
│       ├── generate/route.ts      # Existing: Single generation
│       ├── batch/
│       │   ├── create/route.ts   # NEW: Submit batch job
│       │   └── status/route.ts   # NEW: Poll batch status
│       └── sheets/
│           ├── connect/route.ts   # NEW: OAuth initiation
│           ├── callback/route.ts  # NEW: OAuth completion
│           └── sync/route.ts      # NEW: Import from sheet
├── lib/
│   ├── ai/
│   │   ├── ai33-client.ts        # NEW: AI33 API wrapper
│   │   ├── google-client.ts      # Adapted from generation-service.ts
│   │   └── image-generator.ts    # NEW: Unified interface with fallback
│   ├── queue/
│   │   ├── connection.ts         # BullMQ Redis connection
│   │   ├── thumbnail-queue.ts    # Queue definition
│   │   └── worker.ts             # Job processor logic
│   ├── sheets/
│   │   ├── oauth.ts              # Google OAuth 2.0 flow
│   │   ├── client.ts             # Google Sheets API wrapper
│   │   └── sync.ts               # Sheet → BatchJob conversion
│   └── storage/
│       ├── r2.ts                 # Cloudflare R2 client
│       └── zip.ts                # Batch ZIP generation
├── worker.ts                      # Standalone worker process entry point
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-20-thumbnail-migration-design.md
```

### Runtime Processes

**1. Next.js Dashboard (Port 3072)**
- **Purpose:** User interface for thumbnail management
- **Features:**
  - Existing: Single thumbnail generation, channel/archetype CRUD
  - New: Bulk operations, Google Sheets integration, batch monitoring
- **Startup:** `npm start` (production build via `npm run build`)
- **Process Management:** systemd (`thumbnail-dashboard.service`)

**2. Queue Worker (Separate Node Process)**
- **Purpose:** Background job processing
- **Responsibilities:**
  - Poll BullMQ for thumbnail generation jobs
  - Execute AI33 → Google fallback logic
  - Update job status in PostgreSQL
  - Generate ZIP files for completed batches
  - Upload outputs to Cloudflare R2
- **Startup:** `node worker.js`
- **Process Management:** systemd (`thumbnail-worker.service`)
- **Concurrency:** 5 simultaneous jobs (rate limit protection)

---

## Database Schema

### Migration Strategy

**Current State:** Prisma 5 + SQLite (file: `prisma/dev.db`)
**Target State:** Prisma 5 + PostgreSQL (port 5433, dedicated instance)

**Migration Path:**
1. Update `schema.prisma` datasource to PostgreSQL
2. Add new models (BatchJob, GoogleSheetsConnection)
3. Run `prisma migrate dev` to generate initial migration
4. Export existing data from SQLite (if any production data exists)
5. Import to PostgreSQL via seed script

**Rationale for Staying on Prisma 5:**
- Prisma 7 requires complex LibSQL adapter configuration
- Prisma 5 has stable PostgreSQL support
- Avoids migration complexity during production push

### Schema Definition

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Existing Models (from Thumbnail V2)
// ============================================

model Channel {
  id                  String          @id @default(cuid())
  name                String
  personaDescription  String          @db.Text // 200+ words for character consistency
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  archetypes          Archetype[]
  generationJobs      GenerationJob[]
}

model Archetype {
  id                  String          @id @default(cuid())
  name                String
  channelId           String
  channel             Channel         @relation(fields: [channelId], references: [id], onDelete: Cascade)
  imageUrl            String          // Reference image URL (stored in R2)
  layoutInstructions  String          @db.Text
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  generationJobs      GenerationJob[]

  @@index([channelId])
}

model GenerationJob {
  id              String          @id @default(cuid())
  channelId       String
  channel         Channel         @relation(fields: [channelId], references: [id], onDelete: Cascade)
  archetypeId     String
  archetype       Archetype       @relation(fields: [archetypeId], references: [id], onDelete: Cascade)
  videoTopic      String
  thumbnailText   String
  customPrompt    String?         @db.Text
  status          JobStatus       @default(PROCESSING)
  outputUrl       String?         // R2 public URL
  errorMessage    String?         @db.Text
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // NEW: Batch processing fields
  batchJobId      String?
  batchJob        BatchJob?       @relation(fields: [batchJobId], references: [id], onDelete: SetNull)
  aiProvider      AIProvider      @default(AI33)
  fallbackUsed    Boolean         @default(false)
  fallbackReason  String?         @db.Text

  @@index([channelId])
  @@index([archetypeId])
  @@index([batchJobId])
  @@index([status])
}

enum JobStatus {
  PROCESSING
  COMPLETED
  FAILED
}

enum AIProvider {
  AI33
  GOOGLE
}

// ============================================
// NEW Models (for Bulk Operations)
// ============================================

model BatchJob {
  id              String          @id @default(cuid())
  userId          String?         // Optional: future multi-user support
  name            String          // User-provided batch name
  status          BatchStatus     @default(PENDING)
  totalJobs       Int
  completedJobs   Int             @default(0)
  failedJobs      Int             @default(0)
  outputZipUrl    String?         // R2 URL of ZIP file (when completed)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  jobs            GenerationJob[]

  @@index([status])
  @@index([userId])
}

enum BatchStatus {
  PENDING       // Batch created, jobs not yet queued
  PROCESSING    // Jobs actively being processed
  COMPLETED     // All jobs completed successfully
  FAILED        // All jobs failed (critical error)
  PARTIAL       // Some jobs succeeded, some failed
}

model GoogleSheetsConnection {
  id              String          @id @default(cuid())
  userId          String          @unique
  accessToken     String          @db.Text // Encrypted (AES-256)
  refreshToken    String          @db.Text // Encrypted (AES-256)
  expiresAt       DateTime
  sheetId         String?         // Last connected Google Sheet ID
  sheetName       String?         // User-friendly sheet name
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([userId])
}
```

### Key Design Decisions

**1. Batch Job Status Flow:**
```
PENDING → PROCESSING → [COMPLETED | FAILED | PARTIAL]
```
- PARTIAL status allows downloading successful thumbnails even if some failed
- Tracks completedJobs/failedJobs for progress UI

**2. AI Provider Tracking:**
- Every GenerationJob records which provider was used (AI33 or GOOGLE)
- fallbackUsed flag indicates if primary provider failed
- fallbackReason stores error message for debugging

**3. Google Sheets Token Storage:**
- Tokens encrypted at rest using AES-256 (key in .env)
- Per-user OAuth flow (future-proofs multi-VA support)
- Refresh token allows background sync without re-auth

**4. Cascading Deletes:**
- Deleting Channel removes all Archetypes and GenerationJobs
- Deleting BatchJob does NOT delete GenerationJobs (SetNull foreign key)
  - Rationale: Individual jobs remain accessible after batch is deleted

---

## Queue Architecture

### BullMQ Setup

**Queue Definition:**

```typescript
// lib/queue/connection.ts
import Redis from 'ioredis';

export const redisConnection = new Redis({
  host: 'localhost',
  port: 6380,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

```typescript
// lib/queue/thumbnail-queue.ts
import { Queue, Worker } from 'bullmq';
import { redisConnection } from './connection';

export const thumbnailQueue = new Queue('thumbnail-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Max 1000 completed jobs in Redis
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days (debugging)
    },
  },
});
```

### Job Payload

```typescript
interface ThumbnailJobData {
  jobId: string;              // GenerationJob.id (database primary key)
  batchJobId?: string;        // Optional: BatchJob.id if part of batch
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
}
```

### Job Flow

**1. Single Thumbnail Generation:**
```
User submits form
  ↓
POST /api/generate
  ↓
Create GenerationJob (status: PROCESSING)
  ↓
Queue job to BullMQ
  ↓
Worker picks up job
  ↓
Generate image (AI33 → Google fallback)
  ↓
Upload to R2
  ↓
Update GenerationJob (status: COMPLETED, outputUrl: "https://...")
  ↓
Return success to user
```

**2. Batch Generation (Google Sheets):**
```
User connects Google Sheet
  ↓
POST /api/sheets/sync (sheet contains 100 rows)
  ↓
Create BatchJob (status: PENDING, totalJobs: 100)
  ↓
Create 100 GenerationJob records (status: PROCESSING, batchJobId: "cm...")
  ↓
Queue 100 jobs to BullMQ
  ↓
Update BatchJob (status: PROCESSING)
  ↓
Worker processes jobs (concurrency: 5)
  ↓
Each job completion: Increment BatchJob.completedJobs
  ↓
All jobs done: Generate ZIP file
  ↓
Upload ZIP to R2
  ↓
Update BatchJob (status: COMPLETED, outputZipUrl: "https://...")
  ↓
Optionally: Update Google Sheet rows (status: "completed", output_url: "...")
```

### Worker Implementation

```typescript
// worker.ts
import { Worker } from 'bullmq';
import { redisConnection } from './lib/queue/connection';
import { generateThumbnail } from './lib/ai/image-generator';
import { prisma } from './lib/db';
import { uploadToR2 } from './lib/storage/r2';

const worker = new Worker(
  'thumbnail-generation',
  async (job) => {
    const { jobId, channelId, archetypeId, videoTopic, thumbnailText, customPrompt } = job.data;

    // Fetch database records
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    const archetype = await prisma.archetype.findUnique({ where: { id: archetypeId } });

    if (!channel || !archetype) {
      throw new Error(`Channel or Archetype not found`);
    }

    // Build prompt
    const prompt = customPrompt || `${channel.personaDescription}\n${archetype.layoutInstructions}\nVideo Topic: ${videoTopic}\nThumbnail Text: ${thumbnailText}`;

    // Generate image with fallback
    const result = await generateThumbnail(prompt, [archetype.imageUrl]);

    // Upload to R2
    const outputUrl = await uploadToR2(result.buffer, `${jobId}.png`);

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

    // Update batch progress if part of batch
    if (job.data.batchJobId) {
      await prisma.batchJob.update({
        where: { id: job.data.batchJobId },
        data: {
          completedJobs: { increment: 1 },
        },
      });

      // Check if batch is complete
      const batch = await prisma.batchJob.findUnique({
        where: { id: job.data.batchJobId },
        include: { jobs: true },
      });

      const allDone = batch.jobs.every(j => j.status === 'COMPLETED' || j.status === 'FAILED');
      if (allDone) {
        // Generate ZIP and update batch
        const zipUrl = await generateBatchZip(batch.id);
        await prisma.batchJob.update({
          where: { id: batch.id },
          data: {
            status: batch.failedJobs === 0 ? 'COMPLETED' : 'PARTIAL',
            outputZipUrl: zipUrl,
          },
        });
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs simultaneously
    limiter: {
      max: 10,      // Max 10 jobs per interval
      duration: 60000, // Per 60 seconds (rate limiting)
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);

  // Update database on failure
  prisma.generationJob.update({
    where: { id: job.data.jobId },
    data: {
      status: 'FAILED',
      errorMessage: err.message,
    },
  }).catch(console.error);

  // Update batch failure count
  if (job.data.batchJobId) {
    prisma.batchJob.update({
      where: { id: job.data.batchJobId },
      data: {
        failedJobs: { increment: 1 },
      },
    }).catch(console.error);
  }
});

console.log('Worker started, waiting for jobs...');
```

### Concurrency & Rate Limiting

**Strategy:**
- **Concurrency: 5** - Process 5 jobs simultaneously
  - Balances throughput with API rate limits
  - Prevents overwhelming AI providers

- **Rate Limit: 10 jobs per 60 seconds**
  - AI33 API has undocumented rate limits (observed: ~10-15/min safe)
  - BullMQ enforces limit across all concurrent workers

**Retry Strategy:**
- **Attempts: 3** - Retry failed jobs up to 3 times
- **Backoff: Exponential** - 2s, 4s, 8s delays
- **Failure Handling:**
  - After 3 attempts: Mark job as FAILED
  - User can manually retry failed jobs from UI

---

## AI Generation Strategy

### Provider Hierarchy

**Primary: AI33** (Cost-optimized)
- Endpoint: `https://api.ai33.pro/v1i/task/generate-image`
- Model: `bytedance-seedream-4.5`
- Cost: ~$0.03-0.05 per image (estimated)
- Speed: 10-30 seconds per generation

**Fallback: Google Gemini** (Reliability)
- Models: `gemini-3.1-flash-image-preview` → `gemini-3-pro-image-preview` → `gemini-2.5-flash-image`
- Cost: $0.07-0.13 per image
- Speed: 15-45 seconds per generation

### Unified Generation Interface

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
  referenceImages: string[], // R2 URLs
): Promise<GenerationResult> {
  try {
    console.log('Attempting generation with AI33...');
    const buffer = await generateImageAI33(prompt, referenceImages);

    return {
      buffer,
      provider: 'AI33',
      fallbackUsed: false,
    };
  } catch (error) {
    console.warn('AI33 failed, falling back to Google Gemini:', error);

    try {
      const result = await callNanoBanana(prompt, referenceImages);

      return {
        buffer: result.buffer,
        provider: 'GOOGLE',
        fallbackUsed: true,
        fallbackReason: `AI33 error: ${error.message}`,
      };
    } catch (fallbackError) {
      throw new Error(
        `Both AI33 and Google Gemini failed.\n` +
        `AI33: ${error.message}\n` +
        `Google: ${fallbackError.message}`
      );
    }
  }
}
```

### AI33 Client Implementation

```typescript
// lib/ai/ai33-client.ts
const AI33_BASE_URL = 'https://api.ai33.pro';
const AI33_API_KEY = process.env.AI33_API_KEY!;

export async function generateImageAI33(
  prompt: string,
  referenceImages: string[], // R2 URLs
): Promise<Buffer> {
  // Download reference images
  const imageBufs = await Promise.all(
    referenceImages.map(url => fetch(url).then(r => r.arrayBuffer()).then(Buffer.from))
  );

  // Build multipart form data
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('model_id', 'bytedance-seedream-4.5');
  formData.append('generations_count', '1');
  formData.append('model_parameters', JSON.stringify({
    aspect_ratio: '16:9',
    resolution: '2K',
  }));

  // Attach reference images
  imageBufs.forEach((buf, i) => {
    formData.append('assets', new Blob([buf]), `ref${i}.png`);
  });

  // Submit job
  const submitRes = await fetch(`${AI33_BASE_URL}/v1i/task/generate-image`, {
    method: 'POST',
    headers: { 'xi-api-key': AI33_API_KEY },
    body: formData,
  });

  if (!submitRes.ok) {
    throw new Error(`AI33 submission failed: ${submitRes.status} ${await submitRes.text()}`);
  }

  const { task_id } = await submitRes.json();

  // Poll for completion
  const POLL_INTERVAL = 5000; // 5 seconds
  const MAX_ATTEMPTS = 120;   // 10 minutes max

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    const statusRes = await fetch(`${AI33_BASE_URL}/v1/task/${task_id}`, {
      headers: { 'xi-api-key': AI33_API_KEY },
    });

    const task = await statusRes.json();

    if (task.status === 'done') {
      const imageUrl = task.metadata.result_images[0].imageUrl;
      const imageRes = await fetch(imageUrl);
      return Buffer.from(await imageRes.arrayBuffer());
    }

    if (task.status === 'error') {
      throw new Error(`AI33 generation failed: ${task.error_message}`);
    }
  }

  throw new Error('AI33 generation timeout after 10 minutes');
}
```

### Google Gemini Client (Adapted)

```typescript
// lib/ai/google-client.ts
// Adapted from existing lib/generation-service.ts
// Keep existing fallback chain logic:
//   1. gemini-3.1-flash-image-preview (Nano Banana 2)
//   2. gemini-3-pro-image-preview (Nano Banana Pro)
//   3. gemini-2.5-flash-image (Nano Banana OG)

// (Implementation remains same as current generation-service.ts)
```

### Cost Tracking

**Database Field:** `GenerationJob.aiProvider`
- Query monthly costs: `SELECT aiProvider, COUNT(*) FROM GenerationJob WHERE createdAt > ...`
- Expected savings: 60-70% cost reduction (AI33 vs Google)

---

## Google Sheets Integration

### OAuth 2.0 Flow

**User Experience:**
1. User navigates to `/bulk` page
2. Clicks "Connect Google Sheets" button
3. Redirected to Google OAuth consent screen
4. Grants read-only access to Google Sheets
5. Redirected back to app with authorization code
6. App exchanges code for access/refresh tokens
7. Tokens encrypted and stored in database

**Implementation:**

```typescript
// app/api/sheets/connect/route.ts
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';

export async function GET() {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/sheets/callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    prompt: 'consent', // Force refresh token on first auth
  });

  return Response.redirect(authUrl);
}
```

```typescript
// app/api/sheets/callback/route.ts
import { google } from 'googleapis';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const session = await getServerSession();

  if (!code || !session) {
    return Response.redirect('/bulk?error=auth_failed');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/sheets/callback`
  );

  const { tokens } = await oauth2Client.getToken(code);

  // Store encrypted tokens
  await prisma.googleSheetsConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      accessToken: encrypt(tokens.access_token!),
      refreshToken: encrypt(tokens.refresh_token!),
      expiresAt: new Date(tokens.expiry_date!),
    },
    update: {
      accessToken: encrypt(tokens.access_token!),
      refreshToken: encrypt(tokens.refresh_token!),
      expiresAt: new Date(tokens.expiry_date!),
    },
  });

  return Response.redirect('/bulk?connected=true');
}
```

### Sheet Format Specification

**Required Columns:**
| Column Name      | Type   | Description                          | Example              |
|-----------------|--------|--------------------------------------|----------------------|
| `channel_name`  | String | Must match Channel.name in database  | "Tech Explained"     |
| `archetype_name`| String | Must match Archetype.name            | "Tutorial Layout"    |
| `video_topic`   | String | Topic for the video                  | "Docker Tutorial"    |
| `thumbnail_text`| String | Text to overlay on thumbnail         | "DOCKER MASTERY"     |
| `status`        | String | Row processing status                | "pending"            |

**Optional Columns:**
| Column Name     | Type   | Description                          |
|----------------|--------|--------------------------------------|
| `custom_prompt`| String | Override default prompt generation   |
| `output_url`   | String | Populated by system after generation |
| `error`        | String | Error message if generation failed   |

**Status Values:**
- `pending` - Row not yet processed
- `processing` - Job queued or in progress
- `completed` - Thumbnail generated successfully
- `failed` - Generation failed (see error column)

### Sync Implementation

```typescript
// app/api/sheets/sync/route.ts
import { google } from 'googleapis';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { thumbnailQueue } from '@/lib/queue/thumbnail-queue';

export async function POST(request: Request) {
  const { sheetId } = await request.json();
  const session = await getServerSession();

  // Get stored OAuth tokens
  const connection = await prisma.googleSheetsConnection.findUnique({
    where: { userId: session.user.id },
  });

  if (!connection) {
    return Response.json({ error: 'Not connected to Google Sheets' }, { status: 400 });
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
    range: 'A1:F1000', // Read first 1000 rows
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return Response.json({ error: 'Sheet is empty' }, { status: 400 });
  }

  // Parse header row
  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const dataRows = rows.slice(1);

  // Filter pending rows
  const pendingRows = dataRows.filter(row => {
    const statusIdx = headers.indexOf('status');
    return statusIdx !== -1 && row[statusIdx]?.toLowerCase() === 'pending';
  });

  if (pendingRows.length === 0) {
    return Response.json({ message: 'No pending rows found' });
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
    const channelName = row[headers.indexOf('channel_name')];
    const archetypeName = row[headers.indexOf('archetype_name')];
    const videoTopic = row[headers.indexOf('video_topic')];
    const thumbnailText = row[headers.indexOf('thumbnail_text')];
    const customPrompt = row[headers.indexOf('custom_prompt')];

    // Lookup channel and archetype IDs
    const channel = await prisma.channel.findFirst({ where: { name: channelName } });
    const archetype = await prisma.archetype.findFirst({ where: { name: archetypeName } });

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
        customPrompt,
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
      customPrompt,
    });

    jobs.push(job);
  }

  // Update batch status
  await prisma.batchJob.update({
    where: { id: batchJob.id },
    data: { status: 'PROCESSING' },
  });

  return Response.json({
    success: true,
    batchJobId: batchJob.id,
    jobsQueued: jobs.length,
  });
}
```

---

## User Interface Design

### Bulk Operations Page (`/bulk`)

**Navigation:**
- Add new item to left sidebar: "📦 Bulk Generator"
- Route: `/bulk`

**Page Layout:**

```tsx
// app/bulk/page.tsx
export default function BulkGeneratorPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Bulk Thumbnail Generator</h1>

      {/* Tab Navigation */}
      <Tabs defaultValue="sheets">
        <TabsList>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
          <TabsTrigger value="manual">Manual Upload</TabsTrigger>
        </TabsList>

        {/* Google Sheets Tab */}
        <TabsContent value="sheets">
          <GoogleSheetsConnect />
          <SheetPreview />
          <BatchProgress />
        </TabsContent>

        {/* Manual Upload Tab */}
        <TabsContent value="manual">
          <ManualUpload />
          <BatchProgress />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Component Breakdown

**1. GoogleSheetsConnect Component**

```tsx
// app/bulk/components/GoogleSheetsConnect.tsx
export function GoogleSheetsConnect() {
  const [connected, setConnected] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleConnect = async () => {
    window.location.href = '/api/sheets/connect';
  };

  const handleDisconnect = async () => {
    await fetch('/api/sheets/disconnect', { method: 'POST' });
    setConnected(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Google Sheets Integration</CardTitle>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              <span>Connected as {userEmail}</span>
            </div>
            <Button variant="outline" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Connect your Google account to import thumbnail requests from Google Sheets.
            </p>
            <Button onClick={handleConnect}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                {/* Google Sheets icon */}
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

**2. SheetPreview Component**

```tsx
// app/bulk/components/SheetPreview.tsx
export function SheetPreview() {
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [preview, setPreview] = useState([]);

  const handleSheetSelect = async (sheetId: string) => {
    setSelectedSheet(sheetId);
    const res = await fetch(`/api/sheets/preview?sheetId=${sheetId}`);
    const data = await res.json();
    setPreview(data.rows);
  };

  const handleGenerate = async () => {
    await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId: selectedSheet }),
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Select Sheet</CardTitle>
      </CardHeader>
      <CardContent>
        <Select onValueChange={handleSheetSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a sheet..." />
          </SelectTrigger>
          <SelectContent>
            {sheets.map(sheet => (
              <SelectItem key={sheet.id} value={sheet.id}>
                {sheet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preview.length > 0 && (
          <div className="mt-4">
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

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <strong>{preview.length}</strong> pending thumbnails
              </p>
              <Button onClick={handleGenerate}>
                Generate All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**3. BatchProgress Component**

```tsx
// app/bulk/components/BatchProgress.tsx
export function BatchProgress() {
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/batch/list');
      const data = await res.json();
      setBatches(data.batches);
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>📦 Active Batches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {batches.map(batch => (
            <div key={batch.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{batch.name}</h3>
                <Badge variant={
                  batch.status === 'COMPLETED' ? 'success' :
                  batch.status === 'FAILED' ? 'destructive' :
                  'secondary'
                }>
                  {batch.status}
                </Badge>
              </div>

              <Progress
                value={(batch.completedJobs / batch.totalJobs) * 100}
                className="mb-2"
              />

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {batch.completedJobs} / {batch.totalJobs} completed
                  {batch.failedJobs > 0 && ` (${batch.failedJobs} failed)`}
                </span>

                {batch.status === 'COMPLETED' && batch.outputZipUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={batch.outputZipUrl} download>
                      <Download className="w-4 h-4 mr-2" />
                      Download ZIP
                    </a>
                  </Button>
                )}
              </div>

              {batch.failedJobs > 0 && (
                <Button variant="ghost" size="sm" className="mt-2">
                  View Errors
                </Button>
              )}
            </div>
          ))}

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

**4. ManualUpload Component**

```tsx
// app/bulk/components/ManualUpload.tsx
export function ManualUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);

    // Parse CSV/JSON and show preview
    const text = await file.text();
    const rows = parseCSV(text); // or parseJSON(text)
    setPreview(rows);
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('file', file!);

    await fetch('/api/batch/upload', {
      method: 'POST',
      body: formData,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📂 Manual Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop a CSV or JSON file here, or click to browse
              </p>
            </label>
          </div>

          {preview.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Preview ({preview.length} rows):</h3>
              {/* Same table as SheetPreview */}
              <Button onClick={handleSubmit} className="mt-4">
                Submit Batch
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Deployment Strategy

### Environment Configuration

**File:** `.env` (production)

```bash
# Node Environment
NODE_ENV=production
PORT=3072

# Database
DATABASE_URL=postgresql://postgres:ThumbnailGen2026!Secure#Prod@localhost:5433/thumbnail_generator

# Redis
REDIS_URL=redis://localhost:6380

# AI Providers
GOOGLE_API_KEY=AIzaSyCOBeWow7cVNcjwS96pgKokgOfj8MDda7Y
AI33_API_KEY=sk_hf3katk8w7u2r9grvmascsuafqhv8wtydcebxq75frnuf7d5

# Cloudflare R2 Storage
R2_ENDPOINT=https://2fbfa802850f67b30e87b3c861c59d9b.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=c998d7a060ea1d6e49fa137f5f5f75aa
R2_SECRET_ACCESS_KEY=935db6fcb2507cbe691439be402bfb56d0a45ec5b1ec2ca9e894df7271eeba5d
R2_BUCKET_NAME=thumbnails
R2_PUBLIC_URL=https://pub-2fbfa802850f67b30e87b3c861c59d9b.r2.dev

# Authentication
NEXTAUTH_SECRET=lBoYTa1Jidu+KprBOrHEUammUyQBbdcTxnYra7kfmoQ=
NEXTAUTH_URL=https://thumbnails.yourdomain.com

# Email
RESEND_API_KEY=re_VexVW8cn_6r4GKRC335bXnxELJoEdKQvN

# Google Sheets OAuth
GOOGLE_CLIENT_ID=provided_by_user
GOOGLE_CLIENT_SECRET=provided_by_user

# Encryption Key (for OAuth tokens)
ENCRYPTION_KEY=generate_32_byte_key_via_openssl

# Docker
POSTGRES_PASSWORD=ThumbnailGen2026!Secure#Prod
```

### Server Setup

**SSH Connection:**
```bash
ssh root@65.108.6.149
```

**1. Create Project Directory**
```bash
mkdir -p /opt/thumbnail-generator
cd /opt/thumbnail-generator
```

**2. Transfer Codebase**
```bash
# Local machine:
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.next' \
    --exclude='.turbo' \
    -czf thumbnail.tar.gz .

scp thumbnail.tar.gz root@65.108.6.149:/opt/thumbnail-generator/

# Server:
cd /opt/thumbnail-generator
tar -xzf thumbnail.tar.gz
rm thumbnail.tar.gz
```

**3. Install Dependencies**
```bash
npm install
```

**4. Create .env File**
```bash
cp .env.example .env
nano .env
# Fill in production values
```

**5. Start Infrastructure**
```bash
docker compose up -d

# Verify services
docker compose ps
```

**6. Run Database Migrations**
```bash
npx prisma generate
npx prisma migrate deploy
```

**7. Build Application**
```bash
npm run build
```

**8. Seed Initial Data (Optional)**
```bash
npm run db:seed
```

### Systemd Service Configuration

**Dashboard Service:**

```ini
# /etc/systemd/system/thumbnail-dashboard.service
[Unit]
Description=Thumbnail Generator Dashboard (Next.js)
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/thumbnail-generator
EnvironmentFile=/opt/thumbnail-generator/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Worker Service:**

```ini
# /etc/systemd/system/thumbnail-worker.service
[Unit]
Description=Thumbnail Generator Queue Worker
After=network.target docker.service thumbnail-dashboard.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/thumbnail-generator
EnvironmentFile=/opt/thumbnail-generator/.env
ExecStart=/usr/bin/node worker.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Enable and Start Services:**
```bash
# Reload systemd
systemctl daemon-reload

# Enable auto-start on boot
systemctl enable thumbnail-dashboard
systemctl enable thumbnail-worker

# Start services
systemctl start thumbnail-dashboard
systemctl start thumbnail-worker

# Check status
systemctl status thumbnail-dashboard
systemctl status thumbnail-worker

# View logs
journalctl -u thumbnail-dashboard -f
journalctl -u thumbnail-worker -f
```

### Nginx Reverse Proxy

**Configuration:**

```nginx
# /etc/nginx/sites-available/thumbnail-generator
server {
    listen 80;
    server_name thumbnails.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name thumbnails.yourdomain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/thumbnails.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/thumbnails.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3072;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase upload size for batch file uploads
    client_max_body_size 50M;
}
```

**Enable Configuration:**
```bash
# Create symlink
ln -s /etc/nginx/sites-available/thumbnail-generator /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### SSL Certificate Setup

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d thumbnails.yourdomain.com

# Auto-renewal (cron job already created by certbot)
```

### Monitoring & Logs

**View Service Logs:**
```bash
# Dashboard logs
journalctl -u thumbnail-dashboard -f --since "10 minutes ago"

# Worker logs
journalctl -u thumbnail-worker -f --since "10 minutes ago"

# Docker container logs
docker compose logs -f postgres
docker compose logs -f redis
```

**Health Check Endpoints:**
- `GET /api/health` - Application health
- `GET /api/queue/stats` - Queue statistics (job counts, processing rate)

**Database Access:**
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d thumbnail_generator

# Common queries
SELECT status, COUNT(*) FROM "GenerationJob" GROUP BY status;
SELECT * FROM "BatchJob" WHERE status = 'PROCESSING';
```

---

## Migration Path

### Existing Data Migration (if applicable)

If production data exists in current Vercel/Supabase deployment:

**1. Export SQLite Data (if using local SQLite):**
```bash
sqlite3 prisma/dev.db .dump > backup.sql
```

**2. Export Supabase Data:**
```bash
# Using Supabase dashboard or pg_dump
pg_dump -h db.ezgtctlpeuhpzmbysxqm.supabase.co -U postgres -d postgres > supabase_backup.sql
```

**3. Transform Data for PostgreSQL:**
```bash
# May need to adjust SQL syntax differences
# Convert cuid() defaults, adjust timestamps, etc.
```

**4. Import to New PostgreSQL:**
```bash
docker compose exec -T postgres psql -U postgres -d thumbnail_generator < transformed_backup.sql
```

### Deployment Checklist

**Pre-Deployment:**
- [ ] All code changes committed
- [ ] .env.example updated with new variables
- [ ] Database migrations tested locally
- [ ] Docker Compose configuration tested locally
- [ ] Nginx configuration prepared
- [ ] Domain DNS pointed to VPS IP

**Deployment:**
- [ ] Create `/opt/thumbnail-generator` directory
- [ ] Transfer codebase via tar archive
- [ ] Create `.env` file with production credentials
- [ ] Start Docker services (PostgreSQL + Redis)
- [ ] Run database migrations
- [ ] Build Next.js application
- [ ] Configure systemd services
- [ ] Start dashboard and worker services
- [ ] Configure Nginx reverse proxy
- [ ] Obtain SSL certificate
- [ ] Verify services running correctly

**Post-Deployment:**
- [ ] Test single thumbnail generation
- [ ] Test Google Sheets OAuth flow
- [ ] Test batch job submission
- [ ] Monitor logs for errors
- [ ] Verify queue processing
- [ ] Test ZIP file generation
- [ ] Confirm R2 uploads working

---

## Security Considerations

### OAuth Token Encryption

**Encryption Implementation:**

```typescript
// lib/crypto.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv + authTag + encrypted
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Generate Encryption Key:**
```bash
openssl rand -hex 32
```

### API Rate Limiting

**Implementation:**

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN, // Optional for authenticated Redis
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per 60 seconds
});

// Usage in API routes:
// const { success } = await ratelimit.limit(request.ip);
// if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
```

### Input Validation

**Sanitize User Inputs:**
```typescript
// lib/validation.ts
import { z } from 'zod';

export const batchJobSchema = z.object({
  name: z.string().min(1).max(100),
  rows: z.array(z.object({
    channel_name: z.string().min(1).max(100),
    archetype_name: z.string().min(1).max(100),
    video_topic: z.string().min(1).max(500),
    thumbnail_text: z.string().min(1).max(100),
    custom_prompt: z.string().max(5000).optional(),
  })).max(1000), // Limit to 1000 thumbnails per batch
});
```

### CORS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXTAUTH_URL },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## Future Enhancements

**Phase 2 Roadmap (Post-Launch):**

1. **Multi-User Support**
   - Add user authentication (NextAuth with Google OAuth)
   - User-scoped channels and archetypes
   - Team collaboration features

2. **Advanced Scheduling**
   - Schedule batch jobs for future execution
   - Recurring batch generation (daily/weekly)
   - Timezone support

3. **Analytics Dashboard**
   - Cost tracking per AI provider
   - Generation success rate metrics
   - Popular archetypes and channels
   - Average generation time

4. **Webhook Notifications**
   - Send webhook on batch completion
   - Slack/Discord integration
   - Email notifications with ZIP download link

5. **Template Library**
   - Pre-built archetype templates
   - Community-shared layouts
   - Template marketplace

6. **A/B Testing**
   - Generate multiple variations per request
   - Side-by-side comparison UI
   - Voting system for best thumbnail

7. **Video Integration**
   - Auto-upload thumbnails to YouTube via API
   - Fetch video metadata (title, description)
   - Bulk thumbnail replacement for existing videos

---

## Glossary

**Terms:**
- **Archetype:** Layout template with style instructions for thumbnail generation
- **Batch Job:** Collection of multiple thumbnail generation requests processed together
- **BullMQ:** Redis-based queue library for Node.js
- **Channel:** YouTube channel entity with persona description for character consistency
- **Fallback:** Secondary AI provider (Google Gemini) used when primary (AI33) fails
- **Generation Job:** Single thumbnail generation request
- **Nano Banana:** Google Gemini models for image generation (gemini-*-image-preview)
- **OAuth 2.0:** Authorization protocol for Google Sheets access
- **Persona Description:** 200+ word character description ensuring consistency across thumbnails
- **Queue Worker:** Background process consuming jobs from BullMQ queue
- **R2:** Cloudflare's S3-compatible object storage
- **Systemd:** Linux service manager for running processes as daemons

---

## Conclusion

This design provides a production-ready, scalable thumbnail generation system with complete isolation from existing infrastructure. The architecture supports mass production via Google Sheets integration while maintaining flexibility for future enhancements.

**Key Achievements:**
- ✅ Complete service isolation (separate PostgreSQL, Redis, ports)
- ✅ Cost-optimized AI strategy (AI33 primary, Google fallback)
- ✅ Scalable queue architecture (BullMQ with concurrency control)
- ✅ User-friendly bulk operations UI
- ✅ Production deployment on existing VPS
- ✅ Easy migration path to dedicated server

**Next Steps:**
1. User approval of design document
2. Transition to implementation planning (writing-plans skill)
3. Begin development with parallel agent coordination
