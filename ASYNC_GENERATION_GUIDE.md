# Async Generation Implementation Guide

## Status: Ready for Review & Implementation

This guide provides detailed instructions for converting single thumbnail generation from synchronous (50+ second wait) to asynchronous queue-based processing.

---

## ⚠️ Risk Assessment: HIGH

**Why this is high-risk:**
- Changes core revenue-generating functionality
- Affects credit deduction logic (must remain atomic)
- Requires worker process to be running
- Breaking change in API response format
- Frontend must be updated simultaneously

**Mitigation strategies:**
- Backup created at `app/api/generate/route.ts.backup`
- Credits already deducted before queueing (tested pattern from batch endpoint)
- Queue failure handling with automatic refunds
- Test in development environment first
- Consider gradual rollout or feature flag

---

## Part 1: Backend Changes (Task #12)

### File: `app/api/generate/route.ts`

**Current behavior:**
1. Create job with `status: 'processing'`
2. Immediately call Nano Banana API (50+ seconds)
3. Upload to R2
4. Update job to `status: 'completed'`
5. Return completed job to frontend

**New behavior:**
1. Create job with `status: 'pending'`
2. Add job to BullMQ queue
3. Return job IDs immediately (< 1 second)
4. Worker processes job in background
5. Frontend polls for status updates

### Changes Required

#### 1. Add queue import (line 11)

```typescript
import { thumbnailQueue } from '@/lib/queue/thumbnail-queue';
```

#### 2. Replace synchronous generation loop (lines 214-356)

**Remove:**
- Lines 214-227: Payload building (move to worker)
- Lines 229-231: Success/failure tracking (not needed)
- Lines 233-352: Entire generation loop
- Lines 354-356: Refund comment (update logic)

**Replace with:**

```typescript
// ========================================
// ASYNC QUEUE-BASED GENERATION
// ========================================
// Credits are deducted BEFORE queueing (already done above)
// Create jobs with status='pending' and add to queue
// Return immediately without waiting for generation
// Worker processes jobs asynchronously
// ========================================

console.log(`\n🚀 Queueing ${count} thumbnail generation(s) for user ${userId}`);

for (let i = 0; i < count; i++) {
  // Create initial job record with status='pending'
  let job;
  try {
    job = await prisma.generation_jobs.create({
      data: {
        channelId,
        archetypeId,
        userId,
        videoTopic,
        thumbnailText,
        customPrompt,
        isManual: true,
        status: 'pending', // KEY CHANGE: pending, not processing
        creditsDeducted: shouldDeductCredits ? 1 : null,
        metadata: {
          versionIndex: i,
          includeBrandColors,
          includePersona,
        },
      },
    } as any);

    jobIds.push(job.id);
  } catch (dbError) {
    console.error('Database error: Failed to create job record:', dbError);

    // Fail fast - do not proceed if we can't track jobs
    return NextResponse.json(
      {
        error: 'Database unavailable. Please try again in a moment.',
        technicalDetails: 'Failed to create job record'
      },
      { status: 503 }
    );
  }

  // Add job to BullMQ queue
  try {
    await thumbnailQueue.add(
      'thumbnail-generation',
      {
        jobId: job.id,
        channelId,
        archetypeId,
        videoTopic,
        thumbnailText,
        customPrompt,
        includeBrandColors,
        includePersona,
      },
      {
        jobId: job.id, // Use generation_job ID as queue job ID for tracking
      }
    );

    console.log(`   ✓ Queued job: ${job.id}`);
    results.push({ id: job.id, status: 'pending' });
  } catch (queueError) {
    console.error(`Failed to queue job ${job.id}: ${queueError instanceof Error ? queueError.message : String(queueError)}`);

    // Mark job as failed
    try {
      await prisma.generation_jobs.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: 'Failed to queue job - queue system unavailable',
        },
      } as any);
    } catch (dbError) {
      console.error('DB job update (failed) failed:', dbError);
    }

    results.push({ id: job.id, status: 'failed', errorMessage: 'Failed to queue job' });
  }
}

// Check if ANY jobs were successfully queued
const queuedJobs = results.filter((r: any) => r.status === 'pending');

if (queuedJobs.length === 0) {
  // All jobs failed to queue - refund credits
  if (shouldDeductCredits && creditsDeducted > 0) {
    try {
      await CreditService.refundCredits(
        userId,
        creditsDeducted,
        'Refund: All jobs failed to queue'
      );
      console.log(`   💰 Refunded ${creditsDeducted} credit(s) due to queue failure`);
    } catch (refundError) {
      console.error('Failed to refund credits:', refundError);
    }
  }

  return NextResponse.json(
    { error: 'All jobs failed to queue. Please try again. Your credits have been refunded.' },
    { status: 503 }
  );
}

console.log(`✓ Queue complete: ${queuedJobs.length}/${count} jobs queued successfully`);
```

#### 3. Update response format (lines 358-370)

**Change:**
```typescript
const response: any = {
  success: true,
  jobs: results,
  job: results[0],
};
```

**To:**
```typescript
const response: any = {
  success: true,
  jobs: results, // Array of { id, status: 'pending' }
  message: `Queued ${queuedJobs.length} thumbnail(s) for generation`,
  jobIds: jobIds, // For polling
};
```

### Verification Checklist

- [ ] Queue import added
- [ ] Jobs created with `status: 'pending'`
- [ ] Jobs added to BullMQ queue (not generated synchronously)
- [ ] Queue failures handled with job marked as failed
- [ ] Credits refunded if all queue operations fail
- [ ] Response returns job IDs immediately
- [ ] Backup exists at `route.ts.backup`

---

## Part 2: Frontend Changes (Task #13)

### File: `app/dashboard/components/generate/GenerateForm.tsx`

**Current behavior:**
- Click Generate
- Show loading spinner (50+ seconds)
- Display completed thumbnail
- User waits entire duration

**New behavior:**
- Click Generate
- Show brief "Queuing..." spinner (1-2 seconds)
- Success message: "X thumbnail(s) queued"
- Show "View in History" button OR
- Show real-time status cards with polling

### Changes Required

#### 1. Update state management

```typescript
// Add polling state
const [pollingJobIds, setPollingJobIds] = useState<string[]>([]);
const [jobStatuses, setJobStatuses] = useState<Record<string, any>>({});
```

#### 2. Update generate handler

```typescript
const handleGenerate = async () => {
  setLoading(true);
  setError(null);
  setSuccess(false);

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: selectedChannel,
        archetypeId: selectedArchetype,
        videoTopic,
        thumbnailText,
        customPrompt,
        versionCount,
        includeBrandColors,
        includePersona,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Generation failed');
    }

    // NEW: Handle async response
    const jobIds = data.jobs.map((j: any) => j.id);
    setPollingJobIds(jobIds);
    setSuccess(true);
    setResultMessage(data.message || `Queued ${jobIds.length} thumbnail(s)`);

    // Optional: Start polling immediately
    startPolling(jobIds);

  } catch (err) {
    setError(err instanceof Error ? err.message : 'Generation failed');
  } finally {
    setLoading(false);
  }
};
```

#### 3. Add polling logic

```typescript
const startPolling = (jobIds: string[]) => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/jobs/status?jobIds=${jobIds.join(',')}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Polling failed:', data.error);
        return;
      }

      // Update job statuses
      const statusMap: Record<string, any> = {};
      data.jobs.forEach((job: any) => {
        statusMap[job.id] = job;
      });
      setJobStatuses(statusMap);

      // Stop polling when all complete/failed
      const allDone = data.jobs.every((j: any) =>
        ['completed', 'failed'].includes(j.status)
      );

      if (allDone) {
        clearInterval(pollInterval);
        setPollingJobIds([]);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 5000); // Poll every 5 seconds

  // Cleanup on unmount
  return () => clearInterval(pollInterval);
};
```

#### 4. Update success UI

**Option A: Simple redirect to History**
```tsx
{success && (
  <div className="success-state">
    <CheckCircle size={48} className="text-success" />
    <h3>Thumbnails Queued!</h3>
    <p>{resultMessage}</p>
    <button onClick={() => router.push('/dashboard/history')}>
      View in History
    </button>
  </div>
)}
```

**Option B: Real-time status cards**
```tsx
{pollingJobIds.length > 0 && (
  <div className="job-status-cards">
    {pollingJobIds.map((jobId) => {
      const status = jobStatuses[jobId];
      return (
        <div key={jobId} className="job-card">
          <div className="status-badge">{status?.status || 'pending'}</div>
          {status?.status === 'completed' && (
            <img src={status.outputUrl} alt="Generated thumbnail" />
          )}
          {status?.status === 'processing' && (
            <Loader2 className="animate-spin" />
          )}
        </div>
      );
    })}
  </div>
)}
```

### Verification Checklist

- [ ] Loading state brief (< 2 seconds)
- [ ] Success message shows job count
- [ ] "View in History" button works
- [ ] Polling updates status in real-time
- [ ] Polling stops when all jobs complete
- [ ] Error handling for polling failures

---

## Part 3: Worker Verification

### CRITICAL: Ensure worker is running

**Development:**
```bash
npm run worker
# or
npm run dev:worker
```

**Production (PM2):**
```bash
pm2 list
pm2 logs worker
```

**Production (systemd):**
```bash
systemctl status thumbnail-worker
journalctl -u thumbnail-worker -f
```

### Worker Health Checks

1. **Check queue connection:**
```bash
# From server
redis-cli PING
```

2. **Monitor queue:**
```bash
# Check pending jobs
redis-cli LLEN bull:thumbnail-generation:wait

# Check active jobs
redis-cli LLEN bull:thumbnail-generation:active
```

3. **Test job processing:**
- Generate thumbnail via UI
- Check logs: `pm2 logs worker`
- Verify job transitions: pending → processing → completed

### If Worker Is Not Running

**DO NOT deploy async changes until worker is operational!**

Jobs will remain stuck in 'pending' state forever.

---

## Testing Plan (Task #15)

### Phase 1: Test Completed Features (Tasks 1-11)

#### 1. Manual Upload (Tasks 1-2)
- [ ] Navigate to `/bulk` → Manual Upload tab
- [ ] Drop CSV file with 5 rows
- [ ] Verify preview shows first 5 rows
- [ ] Enter batch name
- [ ] Click "Upload & Queue Batch"
- [ ] Verify success message
- [ ] Check batch appears in history

**Test CSV:**
```csv
channelId,archetypeId,videoTopic,thumbnailText,customPrompt
<your-channel-id>,<your-archetype-id>,Test Video 1,TEST 1,
<your-channel-id>,<your-archetype-id>,Test Video 2,TEST 2,
```

#### 2. Batch List View (Tasks 3-4)
- [ ] Navigate to `/bulk` → Batch History tab
- [ ] Verify list shows all batches
- [ ] Test pagination (if > 20 batches)
- [ ] Test status filter
- [ ] Test search by name
- [ ] Click "View Details" on a batch
- [ ] Verify BatchProgress shows
- [ ] Click "Back to List"
- [ ] Verify returns to list

#### 3. History Filtering (Tasks 5-6)
- [ ] Navigate to `/dashboard/history`
- [ ] Test Type filter: All Jobs → only shows all
- [ ] Test Type filter: Single Generations → only manual, non-batch
- [ ] Test Type filter: Batch Jobs → only batch jobs
- [ ] Test Type filter: Translations → only variant jobs
- [ ] Verify job badges display correctly:
  - Single jobs show "Single" badge
  - Batch jobs show "Batch" badge
  - Translations show "Translation" + language

#### 4. Batch Translation (Tasks 7-9)
- [ ] Navigate to `/dashboard/translate`
- [ ] Click "From Batch" mode
- [ ] Select a completed batch
- [ ] Verify batch preview shows
- [ ] Select 2 target languages
- [ ] Click "Generate Translations"
- [ ] Verify success message
- [ ] Navigate to History
- [ ] Filter by "Translations"
- [ ] Verify translation jobs appear

#### 5. Real-Time Polling (Tasks 10-11)
- [ ] Navigate to `/dashboard/history`
- [ ] Generate a new thumbnail (current sync way)
- [ ] Watch history page
- [ ] Verify page auto-refreshes every 10 seconds
- [ ] Verify job transitions: pending → processing → completed
- [ ] Switch to another tab
- [ ] Wait 15 seconds
- [ ] Switch back
- [ ] Verify polling resumes

### Phase 2: Test Async Generation (Tasks 12-13)

**Prerequisites:**
- [ ] Worker is running and healthy
- [ ] Redis is accessible
- [ ] Backend changes deployed
- [ ] Frontend changes deployed

#### Test Cases

**1. Single Generation (1 thumbnail)**
- [ ] Navigate to Generate tab
- [ ] Fill form, click Generate
- [ ] Response time < 2 seconds
- [ ] Success message shows
- [ ] Job appears in History with "pending" status
- [ ] Wait 60 seconds
- [ ] Refresh History
- [ ] Job shows "completed" with thumbnail
- [ ] Credits deducted correctly

**2. Multiple Versions (4 thumbnails)**
- [ ] Generate with versionCount: 4
- [ ] All 4 jobs created instantly
- [ ] All show "pending" in History
- [ ] Wait for completion
- [ ] All 4 complete successfully
- [ ] Credits: 4 deducted

**3. Queue Failure Scenario**
- [ ] Stop worker: `pm2 stop worker`
- [ ] Generate thumbnail
- [ ] Jobs still created (pending)
- [ ] Wait 5 minutes
- [ ] Jobs remain pending (expected - worker down)
- [ ] Restart worker: `pm2 restart worker`
- [ ] Jobs process automatically
- [ ] Complete successfully

**4. Credit Refund on Queue Failure**
- [ ] Stop Redis: `redis-cli SHUTDOWN`
- [ ] Try to generate
- [ ] Expect error: "All jobs failed to queue"
- [ ] Check credits - should be refunded
- [ ] Restart Redis
- [ ] Retry - should work

### Phase 3: End-to-End Scenarios

**Scenario 1: Batch Upload → Translate**
- [ ] Upload CSV batch (10 rows)
- [ ] Wait for completion
- [ ] Translate entire batch to 3 languages
- [ ] Verify 30 translation jobs created
- [ ] Wait for completion
- [ ] Download batch ZIP
- [ ] Verify all files present

**Scenario 2: Single → Translate**
- [ ] Generate single thumbnail
- [ ] Wait for completion
- [ ] Translate to 2 languages
- [ ] Verify translation jobs
- [ ] Wait for completion
- [ ] Verify all versions present

**Scenario 3: Mixed Operations**
- [ ] Generate 2 single thumbnails
- [ ] Upload batch (5 rows)
- [ ] Translate single thumbnail
- [ ] Navigate to History
- [ ] Filter by "All Jobs"
- [ ] Verify all jobs visible
- [ ] Filter by "Single" → 2 jobs
- [ ] Filter by "Batch" → 5 jobs
- [ ] Filter by "Translation" → 2 jobs

---

## Deployment Strategy

### Option 1: Gradual Rollout (Recommended)

**Step 1: Deploy completed features (Tasks 1-11)**
- Manual upload
- Batch list view
- History filtering
- Batch translation
- Real-time polling

Test these in production for 24-48 hours.

**Step 2: Verify worker health**
- Confirm worker running
- Test queue manually
- Monitor logs for errors

**Step 3: Deploy async generation (Tasks 12-13)**
- Deploy backend first
- Test manually in production
- Deploy frontend
- Monitor for 1 hour
- Full rollout

### Option 2: Feature Flag

Add environment variable:
```env
ENABLE_ASYNC_GENERATION=false
```

Backend:
```typescript
const useAsyncGeneration = process.env.ENABLE_ASYNC_GENERATION === 'true';

if (useAsyncGeneration) {
  // Queue jobs
} else {
  // Synchronous generation (existing code)
}
```

Enable gradually:
- Test users first
- 10% rollout
- 50% rollout
- 100% rollout

### Option 3: All-at-Once (Higher Risk)

Deploy all 15 tasks simultaneously. Only recommended if:
- Development testing is thorough
- Worker is proven stable
- Rollback plan is ready

---

## Rollback Plan

### If Async Generation Fails

**Quick rollback:**
```bash
cd /opt/thumbnail-generator
git checkout HEAD~1 app/api/generate/route.ts
git checkout HEAD~1 app/dashboard/components/generate/GenerateForm.tsx
npm run build
pm2 restart all
```

**OR restore backup:**
```bash
cp app/api/generate/route.ts.backup app/api/generate/route.ts
npm run build
pm2 restart all
```

### Signs You Need to Rollback

- Jobs stuck in 'pending' for > 5 minutes (worker issue)
- Queue errors in logs (Redis connection)
- Credits not deducted (logic error)
- Users reporting "never completes" (worker not processing)

---

## Success Criteria

### All Tasks Complete When:

✅ **Manual upload works:**
- CSV/JSON files parsed correctly
- Batches created and queued
- Thumbnails generate in background

✅ **Batch list works:**
- All batches visible
- Pagination functional
- Filters work
- Detail view accessible

✅ **History filtering works:**
- Type filter returns correct jobs
- Job badges display
- Combined filters work

✅ **Batch translation works:**
- Can select completed batch
- Translations queue successfully
- All languages generated

✅ **Real-time polling works:**
- History auto-refreshes
- Status updates without manual refresh
- Stops polling when complete

✅ **Async generation works:**
- Response < 2 seconds
- Jobs process in background
- Credits deducted correctly
- No jobs stuck in pending
- Worker processes reliably

---

## Notes

- Backup created: `app/api/generate/route.ts.backup`
- All 14 completed tasks are safe to deploy independently
- Async generation (tasks 12-13) is the only high-risk change
- Can deploy completed features now, async generation later
- Worker health is critical for async generation success

---

## Questions Before Implementation

1. **Worker Status:** Is the worker running on production? Check with:
   ```bash
   ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "pm2 list"
   ```

2. **Redis Status:** Is Redis accessible? Check with:
   ```bash
   ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "redis-cli PING"
   ```

3. **Deployment Preference:**
   - Deploy completed features first? (Safer)
   - Deploy all at once? (Faster but riskier)
   - Use feature flag? (Most flexible)

4. **Testing Environment:**
   - Test in local development first?
   - Test on staging server?
   - Test directly in production?

---

**Next Step:** Review this guide, then decide when to implement tasks 12-13.
