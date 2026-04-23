# Feature Testing Checklist - Completed Batch System Features

## Overview

14 of 15 planned features are complete and ready for testing. This checklist helps verify each feature works correctly before deploying the final async generation changes.

**Completed:** Tasks 1-11, 14
**Remaining:** Tasks 12-13 (async generation), 15 (final E2E testing)

---

## Pre-Testing Setup

### 1. Database Check
```bash
cd "C:\Users\konra\OneDrive\Projekte\20260224 Thumbnail Creator V2"
npx prisma studio
```
- [ ] Verify you have at least 1 channel
- [ ] Verify you have at least 2 archetypes
- [ ] Note down channel ID and archetype ID for test data

### 2. Development Server
```bash
npm run dev
```
- [ ] Server starts on port 3000
- [ ] No errors in console
- [ ] Navigate to http://localhost:3000

### 3. Worker Status (Optional for Feature Testing)
Worker NOT required for testing tasks 1-11. Only needed for actual thumbnail generation.

---

## Feature 1: Manual CSV/JSON Upload

**Files Changed:**
- `app/api/batch/upload/route.ts` (NEW)
- `app/bulk/components/ManualUpload.tsx` (UPDATED)

### Test Steps

1. **Navigate to Upload Page**
   - [ ] Go to http://localhost:3000/bulk
   - [ ] Click "Manual Upload" tab
   - [ ] Verify upload interface appears

2. **Create Test CSV File**
   Create `test-batch.csv` with your channel/archetype IDs:
   ```csv
   channelId,archetypeId,videoTopic,thumbnailText,customPrompt
   <YOUR_CHANNEL_ID>,<YOUR_ARCHETYPE_ID>,How to Code React,REACT TIPS,
   <YOUR_CHANNEL_ID>,<YOUR_ARCHETYPE_ID>,Python Tutorial,PYTHON PRO,
   <YOUR_CHANNEL_ID>,<YOUR_ARCHETYPE_ID>,JavaScript Guide,JS MASTER,
   ```

3. **Upload CSV**
   - [ ] Drag test-batch.csv to drop zone
   - [ ] Verify file name shows (e.g., "test-batch.csv 1KB")
   - [ ] Verify preview table shows 3 rows
   - [ ] Batch name auto-filled as "test-batch"

4. **Edit Batch Name**
   - [ ] Change batch name to "Test Upload April 21"
   - [ ] Click "Upload & Queue Batch"

5. **Verify Success**
   - [ ] Success message appears: "Batch Queued Successfully!"
   - [ ] Shows "3 thumbnails queued for generation"
   - [ ] "View Batch" button present
   - [ ] Click "View Batch"

6. **Verify Batch Created**
   - [ ] Redirects to Batch History tab
   - [ ] New batch "Test Upload April 21" appears in list

### Test Edge Cases

**Empty File:**
- [ ] Create empty.csv (0 bytes)
- [ ] Try to upload
- [ ] Expect error: "File is empty"

**Missing Fields:**
- [ ] Create invalid.csv missing thumbnailText column
- [ ] Try to upload
- [ ] Expect error showing which rows are missing fields

**Invalid IDs:**
- [ ] Create invalid-ids.csv with fake channel ID
- [ ] Try to upload
- [ ] Expect error: "Invalid channel IDs found in rows: ..."

**Large File:**
- [ ] Create large.csv with 600 rows
- [ ] Try to upload
- [ ] Expect error: "Maximum 500 rows allowed"

**JSON Format:**
- [ ] Create test-batch.json:
  ```json
  [
    {
      "channelId": "<YOUR_CHANNEL_ID>",
      "archetypeId": "<YOUR_ARCHETYPE_ID>",
      "videoTopic": "JSON Test",
      "thumbnailText": "JSON WORKS"
    }
  ]
  ```
- [ ] Upload JSON file
- [ ] Verify parses correctly
- [ ] Verify batch created

---

## Feature 2: Batch List View

**Files Changed:**
- `app/bulk/components/BatchList.tsx` (NEW)
- `app/bulk/page.tsx` (UPDATED)
- `app/bulk/components/BatchProgress.tsx` (UPDATED - added back button)

### Test Steps

1. **View Batch List**
   - [ ] Go to http://localhost:3000/bulk
   - [ ] Click "Batch History" tab
   - [ ] Verify BatchList component shows
   - [ ] All batches visible in table

2. **Verify Table Columns**
   - [ ] Name column shows batch names
   - [ ] Status column shows badges (PENDING/PROCESSING/COMPLETED/etc)
   - [ ] Progress column shows completion ratio (e.g., "5/10")
   - [ ] Progress bar visual shows percentage
   - [ ] Created column shows relative time (e.g., "2 hours ago")
   - [ ] Actions column has Eye icon button

3. **Test Filters**
   - [ ] Type in search box
   - [ ] Verify only matching batches show
   - [ ] Clear search
   - [ ] Select "COMPLETED" status filter
   - [ ] Verify only completed batches show
   - [ ] Select "All Statuses"

4. **Test Batch Selection**
   - [ ] Click Eye icon on any batch
   - [ ] Verify BatchProgress detail view shows
   - [ ] Verify "Back to List" button appears
   - [ ] Click "Back to List"
   - [ ] Verify returns to BatchList

5. **Test Auto-Refresh** (if you have PROCESSING batches)
   - [ ] Create a batch
   - [ ] Stay on Batch History tab
   - [ ] Wait 10 seconds
   - [ ] Verify list refreshes automatically
   - [ ] Status updates without manual refresh

6. **Test Pagination** (if you have 20+ batches)
   - [ ] Verify "Page 1 of X" shows
   - [ ] Click "Next" button
   - [ ] Verify page 2 loads
   - [ ] Click "Previous"
   - [ ] Verify returns to page 1

### Test Edge Cases

**Empty State:**
- [ ] If you have 0 batches, verify empty state shows:
  - Message: "No batches found"
  - Instructions to create first batch

**Download ZIP** (if worker is running and batch completed):
- [ ] Click Download icon on completed batch
- [ ] Verify ZIP file downloads
- [ ] Open ZIP, verify contains all thumbnails

---

## Feature 3: History Job Type Filtering

**Files Changed:**
- `app/api/history/route.ts` (UPDATED)
- `app/dashboard/hooks/useHistory.ts` (UPDATED)
- `app/dashboard/components/jobs/JobHistoryTable.tsx` (UPDATED)
- `app/dashboard/components/jobs/JobRow.tsx` (UPDATED)

### Test Steps

1. **Prepare Test Data**

   Generate different job types:
   - [ ] Generate 1 single thumbnail (normal generation)
   - [ ] Create 1 batch via manual upload (3 thumbnails)
   - [ ] Translate 1 thumbnail to German (creates translation job)

   *Note: All jobs will be "pending" unless worker is running*

2. **Navigate to History**
   - [ ] Go to http://localhost:3000/dashboard/history
   - [ ] Verify all jobs appear by default

3. **Test Type Filter - All Jobs**
   - [ ] Type filter dropdown shows "All Jobs"
   - [ ] Verify all 5 jobs visible (1 single + 3 batch + 1 translation)

4. **Test Type Filter - Single Generations**
   - [ ] Select "Single Generations" from Type dropdown
   - [ ] Verify only 1 job shows
   - [ ] Verify job has "Single" badge (sparkles icon)

5. **Test Type Filter - Batch Jobs**
   - [ ] Select "Batch Jobs" from Type dropdown
   - [ ] Verify 3 jobs show (the batch uploads)
   - [ ] Verify all have "Batch" badge (layers icon)

6. **Test Type Filter - Translations**
   - [ ] Select "Translations" from Type dropdown
   - [ ] Verify 1 job shows
   - [ ] Verify has "Translation" badge (globe icon + language name)

7. **Test Combined Filters**
   - [ ] Select Type: "Batch Jobs"
   - [ ] Select Status: "Pending"
   - [ ] Verify only pending batch jobs show
   - [ ] Select Channel: (your channel name)
   - [ ] Verify only batch jobs from that channel show

8. **Verify Job Badges Display**

   For each job in the list:
   - [ ] Single manual jobs show: Status badge + "Single" badge
   - [ ] Batch jobs show: Status badge + "Batch" badge
   - [ ] Translation jobs show: Status badge + "Translation" badge + language

### Test Edge Cases

**No Results:**
- [ ] Select Type: "Translations"
- [ ] If you have no translations, verify message:
  - "No jobs found"
  - "No generation jobs match your current search criteria"

**Filter Persistence:**
- [ ] Select "Batch Jobs" filter
- [ ] Navigate away to Generate tab
- [ ] Return to History tab
- [ ] Filter resets to "All Jobs" (expected behavior)

---

## Feature 4: Batch Translation

**Files Changed:**
- `app/api/batch/translate/route.ts` (NEW)
- `app/dashboard/components/translate/BatchSelector.tsx` (NEW)
- `app/dashboard/translate/page.tsx` (UPDATED)

### Test Steps

1. **Prerequisites**
   - [ ] You have at least 1 COMPLETED batch
   - [ ] Batch has at least 1 completed thumbnail
   - [ ] If not, complete a small batch first or use worker

2. **Navigate to Translate Page**
   - [ ] Go to http://localhost:3000/dashboard/translate
   - [ ] Verify 3 mode buttons: "From Existing Job" | "From Batch" | "Upload Images"

3. **Select Batch Mode**
   - [ ] Click "From Batch" button
   - [ ] Verify BatchSelector component appears
   - [ ] Verify shows completed batches only

4. **Select Batch**
   - [ ] Click on a completed batch card
   - [ ] Verify card highlights with blue border
   - [ ] Verify checkmark appears
   - [ ] Verify hint message: "Batch selected. Choose target languages below."

5. **Select Languages**
   - [ ] Scroll to "2. Target Languages" section
   - [ ] Select 2 languages (e.g., German, Spanish)
   - [ ] Verify both chips highlight

6. **Generate Translations**
   - [ ] Click "Generate X Translations" button
   - [ ] Brief loading state
   - [ ] Success message appears
   - [ ] Message shows count (e.g., "Queued 6 translation jobs")

7. **Verify Translation Jobs Created**
   - [ ] Navigate to History tab
   - [ ] Select Type: "Translations"
   - [ ] Verify translation jobs appear
   - [ ] Count matches: (batch thumbnails) × (languages)
   - [ ] Example: 3 thumbnails × 2 languages = 6 translation jobs

### Test Edge Cases

**No Completed Batches:**
- [ ] If you have 0 completed batches:
  - Verify empty state shows
  - Message: "No Completed Batches"
  - Instructions to create batch first

**Large Batch Warning:**
- [ ] Select batch with 50+ thumbnails
- [ ] Select 3 languages
- [ ] Total: 150+ translations
- [ ] Verify console warning (check browser console)
- [ ] Jobs still created successfully

**Multiple Languages:**
- [ ] Select 1 batch with 2 thumbnails
- [ ] Select 4 languages
- [ ] Total: 8 translation jobs
- [ ] Verify all 8 created

**Re-translation:**
- [ ] Translate same batch again to same languages
- [ ] Verify no blocking
- [ ] New translation jobs created (duplicates allowed)

---

## Feature 5: Real-Time Polling

**Files Changed:**
- `app/api/jobs/status/route.ts` (NEW)
- `app/dashboard/components/jobs/JobHistoryTable.tsx` (UPDATED)

### Test Steps

**Note:** This feature requires worker to be running to see status transitions. If worker is off, jobs will stay "pending" (expected).

1. **Test Polling Endpoint Directly**
   - [ ] Create a thumbnail (will be pending if worker off)
   - [ ] Note the job ID from History
   - [ ] Open new tab: http://localhost:3000/api/jobs/status?jobIds=<JOB_ID>
   - [ ] Verify JSON response shows job status

2. **Test Auto-Refresh in History**
   - [ ] Go to History tab
   - [ ] Open browser DevTools → Network tab
   - [ ] Generate new thumbnail (will be pending)
   - [ ] Wait 10 seconds
   - [ ] Verify network request to `/api/history` fires
   - [ ] Verify happens every 10 seconds
   - [ ] List refreshes automatically

3. **Test Polling Stops When Complete** (requires worker)
   - [ ] With worker running, generate thumbnail
   - [ ] Watch History tab
   - [ ] Verify polling active (requests every 10 seconds)
   - [ ] Wait for job to complete (~60 seconds)
   - [ ] Verify polling stops after completion
   - [ ] No more network requests to `/api/history`

4. **Test Visibility API**
   - [ ] Stay on History tab with pending jobs
   - [ ] Switch to different browser tab
   - [ ] Wait 15 seconds
   - [ ] Switch back to History tab
   - [ ] Verify polling resumes
   - [ ] Page refreshes

5. **Test Multiple Active Jobs**
   - [ ] Generate 3 thumbnails
   - [ ] All show "pending" in History
   - [ ] Verify polling active
   - [ ] Wait for all to complete (if worker running)
   - [ ] Verify polling stops when ALL complete

### Test Edge Cases

**No Active Jobs:**
- [ ] Ensure all jobs are completed or failed
- [ ] Navigate to History
- [ ] Verify NO polling requests
- [ ] DevTools Network tab shows no `/api/history` requests

**Worker Offline:**
- [ ] Stop worker
- [ ] Generate thumbnail
- [ ] Job stays "pending"
- [ ] Polling continues (expected - waiting for completion)
- [ ] Restart worker
- [ ] Job processes automatically
- [ ] Status updates to "completed"
- [ ] Polling stops

---

## Integration Tests

### Test 1: Complete Batch Workflow

1. **Upload Batch**
   - [ ] Upload CSV with 5 rows
   - [ ] Verify batch created

2. **Monitor Progress**
   - [ ] Go to Batch History
   - [ ] Click to view batch detail
   - [ ] Verify shows pending jobs

3. **Wait for Completion** (if worker running)
   - [ ] Progress bar updates
   - [ ] Status changes to COMPLETED
   - [ ] All 5 thumbnails generated

4. **Translate Batch**
   - [ ] Go to Translate tab
   - [ ] Select "From Batch"
   - [ ] Choose the completed batch
   - [ ] Translate to 2 languages
   - [ ] Verify 10 translation jobs created

5. **Verify in History**
   - [ ] Go to History
   - [ ] Filter: "Batch Jobs" → 5 jobs
   - [ ] Filter: "Translations" → 10 jobs
   - [ ] Total: 15 jobs from this workflow

### Test 2: Mixed Job Types

1. **Create Diverse Jobs**
   - [ ] Generate 1 single thumbnail
   - [ ] Upload batch with 3 rows
   - [ ] Translate the single thumbnail to German
   - [ ] Upload another batch with 2 rows

2. **Verify History Filtering**
   - [ ] Total jobs: 7 (1 single + 3 batch1 + 1 translation + 2 batch2)
   - [ ] Filter "All Jobs" → 7 jobs
   - [ ] Filter "Single" → 1 job
   - [ ] Filter "Batch" → 5 jobs (3 + 2)
   - [ ] Filter "Translation" → 1 job

3. **Verify Batch List**
   - [ ] Go to Batch History
   - [ ] Verify 2 batches show
   - [ ] First batch: 3/3 complete
   - [ ] Second batch: 2/2 complete

### Test 3: Error Handling

**Invalid CSV:**
- [ ] Upload CSV with missing channelId
- [ ] Verify specific error message
- [ ] No batch created
- [ ] No jobs created

**Invalid Channel ID:**
- [ ] Upload CSV with fake channel ID
- [ ] Verify error: "Invalid channel IDs found in rows: 1, 2"
- [ ] No batch created

**Queue Failure** (requires Redis to be stopped):
- [ ] Stop Redis
- [ ] Try to upload batch
- [ ] Expect server error
- [ ] Restart Redis
- [ ] Retry successfully

---

## Performance Tests

### Batch Upload Speed
- [ ] Upload CSV with 100 rows
- [ ] Time from click to success message
- [ ] Should be < 5 seconds
- [ ] All 100 jobs created

### History Load Time
- [ ] With 50+ jobs in history
- [ ] Navigate to History tab
- [ ] Initial load < 2 seconds
- [ ] Filtering < 500ms

### Batch List Load Time
- [ ] With 20+ batches
- [ ] Navigate to Batch History
- [ ] Initial load < 2 seconds
- [ ] Pagination smooth

---

## Browser Compatibility

Test in multiple browsers:

**Chrome:**
- [ ] All features work
- [ ] No console errors

**Firefox:**
- [ ] All features work
- [ ] No console errors

**Safari:**
- [ ] All features work
- [ ] No console errors

**Edge:**
- [ ] All features work
- [ ] No console errors

---

## Mobile Responsiveness

Test on mobile viewport (DevTools → Toggle device toolbar):

**Batch Upload:**
- [ ] Drop zone works (or click to browse)
- [ ] Preview table scrolls horizontally
- [ ] Buttons not cut off

**Batch List:**
- [ ] Table scrolls horizontally
- [ ] Cards stack vertically
- [ ] Filters don't overlap

**History:**
- [ ] Table scrolls horizontally
- [ ] Filters stack vertically on small screens
- [ ] Job cards readable

---

## Success Criteria

All features pass when:

✅ **Manual Upload:**
- CSV and JSON files parse correctly
- Validation catches all error cases
- Batches create successfully
- Success feedback clear

✅ **Batch List:**
- All batches visible
- Pagination works (if applicable)
- Filters work correctly
- Detail view accessible
- Back button works

✅ **History Filtering:**
- Type filter returns correct jobs
- Job badges display correctly
- Combined filters work
- No jobs missing or duplicated

✅ **Batch Translation:**
- Can select completed batches
- Correct number of jobs created
- Jobs appear in history with translation badges
- Multiple languages work

✅ **Real-Time Polling:**
- Auto-refresh activates for active jobs
- Polling stops when all complete
- Visibility API prevents background polling
- Performance remains smooth

---

## Report Template

After testing, document results:

```markdown
# Test Results - [Date]

## Environment
- Local development / Staging / Production
- Worker running: Yes / No
- Redis accessible: Yes / No

## Results Summary
- Total features tested: 5
- Features passed: X/5
- Features failed: Y/5
- Blockers found: Z

## Feature 1: Manual Upload
Status: ✅ PASS / ❌ FAIL
Issues: [List any issues]

## Feature 2: Batch List
Status: ✅ PASS / ❌ FAIL
Issues: [List any issues]

## Feature 3: History Filtering
Status: ✅ PASS / ❌ FAIL
Issues: [List any issues]

## Feature 4: Batch Translation
Status: ✅ PASS / ❌ FAIL
Issues: [List any issues]

## Feature 5: Real-Time Polling
Status: ✅ PASS / ❌ FAIL
Issues: [List any issues]

## Recommendations
- Deploy immediately / Fix issues first / Further testing needed
```

---

**Next Step:** Complete this checklist, document results, then review ASYNC_GENERATION_GUIDE.md for next phase.
