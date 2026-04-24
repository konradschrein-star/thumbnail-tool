# History Tab Enhancements - Design Specification

**Date:** 2026-04-25
**Status:** Approved
**Author:** Claude Sonnet 4.5

## Overview

Enhance the job history table with bulk operations, richer action buttons, and a dedicated job detail page for viewing, editing, and iterating on generated thumbnails.

## Problem Statement

Users cannot:
- Delete jobs (neither individual nor bulk)
- Copy generated images or job details quickly
- View thumbnails in a large format with full context
- Iterate on existing thumbnails with modifications
- Edit job parameters and regenerate

## Goals

1. **Bulk Operations**: Select multiple jobs and delete them at once
2. **Individual Actions**: Delete, copy image, copy details, copy prompt per job
3. **Detail View**: Full-page view of job with large thumbnail and editable fields
4. **Regeneration**: Re-run exact same job with same settings
5. **Iteration**: Use generated thumbnail as reference and apply user-specified changes

## Design

### 1. History Table Enhancements

#### Selection System

**Checkbox Column:**
- New first column in the table (before Preview column)
- Each row has a checkbox to select that job
- Header row has "Select All" checkbox

**Selection State:**
- Component state: `selectedJobIds: Set<string>`
- Checkbox checked if `selectedJobIds.has(job.id)`
- "Select All" checks/unchecks all visible jobs (respects current filters)

**Bulk Action Bar:**
- Appears at bottom of viewport when `selectedJobIds.size > 0`
- Fixed position, floating glass-style bar
- Shows: "X jobs selected" + "Delete Selected" button
- Clicking "Delete Selected" → Confirmation modal → API call → Refresh list → Clear selection

#### Expanded Action Buttons

Each job row will have these action buttons:

| Button | Icon | Action | Condition |
|--------|------|--------|-----------|
| Copy | 📋 | Copy image to clipboard | status === 'completed' |
| Copy Details | 📄 | Copy job metadata as text | Always |
| Copy Prompt | 💬 | Copy AI prompt used | promptUsed != null |
| Download | ⬇️ | Download image | status === 'completed' |
| View | 👁️ | Open detail page | status === 'completed' |
| Regenerate | 🔄 | Queue new job with same settings | Always |
| Delete | 🗑️ | Delete this job | Always |
| Error | ⚠️ | Show error modal | status === 'failed' |

**Copy Implementations:**
- **Copy Image**: `navigator.clipboard.write()` with image blob
- **Copy Details**: Plain text format with all job fields
- **Copy Prompt**: Copy `job.promptUsed` to clipboard

#### Double-Click Navigation

- Add `onDoubleClick` handler to `<tr>` element
- Navigate to `/dashboard/job/[id]` using Next.js router
- Prevent navigation if click target is a button or checkbox

### 2. Job Detail Page

#### Route Structure

**New Route:** `/dashboard/job/[id]`
**File:** `app/dashboard/job/[id]/page.tsx`

**Data Loading:**
- Use `useParams()` to get job ID
- Fetch job details via `GET /api/jobs/[id]`
- Show loading skeleton while fetching
- Show 404 if job not found

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to History              Job #abc123                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────┐  ┌────────────────────────┐  │
│  │                          │  │ Video Topic            │  │
│  │                          │  │ [input field]          │  │
│  │   LARGE THUMBNAIL        │  │                        │  │
│  │   (16:9 aspect ratio)    │  │ Thumbnail Text         │  │
│  │                          │  │ [input field]          │  │
│  │                          │  │                        │  │
│  └──────────────────────────┘  │ Channel                │  │
│                                 │ [dropdown]             │  │
│                                 │                        │  │
│                                 │ Archetype              │  │
│                                 │ [dropdown]             │  │
│                                 │                        │  │
│                                 │ Prompt Used            │  │
│                                 │ [textarea - editable]  │  │
│                                 │                        │  │
│                                 │ [Regenerate] [Iterate] │  │
│                                 └────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Dimensions:**
- Thumbnail: 70% of viewport width, maintains 16:9 aspect ratio
- Sidebar: 30% of viewport width, scrollable if needed
- On mobile: Stack vertically (thumbnail full-width, then form below)

#### Editable Fields

All fields pre-populated from job data:

1. **Video Topic** - Text input
2. **Thumbnail Text** - Text input
3. **Channel** - Dropdown (fetched from `/api/channels`)
4. **Archetype** - Dropdown (fetched from `/api/archetypes?channelId=X`)
5. **Prompt** - Textarea (shows `job.promptUsed`, editable as custom prompt)

**Form Validation:**
- All fields required except custom prompt
- Real-time validation errors shown inline
- Disable action buttons if form invalid

#### Action Buttons

**Regenerate Button:**
1. Read all current form field values
2. Call `POST /api/generate` with current values
3. Show loading state on button
4. On success: Show toast "Job queued!" → Navigate to `/dashboard?tab=history`
5. On error: Show error toast, keep user on page

**Iterate Button:**
1. Click → Open modal with textarea
2. Modal title: "Iterate on Thumbnail"
3. Textarea label: "What would you like to change about this thumbnail?"
4. Textarea placeholder: "e.g., Make the background blue, add a shocked expression, change text to all caps..."
5. Submit → Call `POST /api/generate/iterate` with:
   - `originalJobId`: Current job ID
   - `referenceImageUrl`: `job.outputUrl`
   - `changeRequest`: User's textarea input
   - Other fields from form (channel, archetype, topic, text)
6. On success: Close modal, show toast, navigate to history

### 3. API Endpoints

#### New Endpoints

**`DELETE /api/jobs/[id]`**
- Delete single job by ID
- Auth: User must own the job (or be admin)
- Cascading: Also delete related variant jobs if any
- Response: `{ success: true, deletedCount: 1 }`

**`DELETE /api/jobs/bulk`**
- Body: `{ jobIds: string[] }`
- Delete multiple jobs
- Auth: User must own all jobs (or be admin)
- Response: `{ success: true, deletedCount: number }`

**`GET /api/jobs/[id]`**
- Fetch full job details including channel and archetype relations
- Auth: User must own the job (or be admin)
- Response: Full `HistoryJob` object

**`POST /api/generate/iterate`**
- Body:
  ```typescript
  {
    originalJobId: string;
    referenceImageUrl: string;
    changeRequest: string;
    channelId: string;
    archetypeId: string;
    videoTopic: string;
    thumbnailText: string;
  }
  ```
- Generates new thumbnail using the reference image + change request
- Builds prompt: Include reference image in multimodal request + "Make these changes: {changeRequest}"
- Response: Same as `/api/generate`

#### Modified Endpoints

**`POST /api/generate`**
- Add optional `referenceImageUrl?: string` parameter
- If provided, include reference image in the generation request
- Used by both Regenerate and Iterate flows

### 4. Component Structure

**New Components:**
```
app/dashboard/job/[id]/
  ├── page.tsx                    # Main detail page
  └── components/
      ├── JobDetailView.tsx       # Layout and form
      ├── IterateModal.tsx        # Modal for iteration input
      └── DeleteConfirmModal.tsx  # Confirmation for delete

app/dashboard/components/jobs/
  ├── JobHistoryTable.tsx         # Updated with selection
  ├── JobRow.tsx                  # Updated with new actions
  ├── BulkActionBar.tsx           # New: Floating action bar
  └── SelectionCheckbox.tsx       # New: Styled checkbox
```

**Updated Components:**
- `JobHistoryTable.tsx` - Add selection state, bulk action bar
- `JobRow.tsx` - Add checkbox, new action buttons, double-click handler

### 5. Data Flow

**Bulk Delete Flow:**
```
User selects jobs → Clicks "Delete Selected"
→ Confirmation modal
→ POST /api/jobs/bulk { jobIds: [...] }
→ Database deletes jobs
→ Response { deletedCount }
→ Refetch history list
→ Clear selection
→ Show success toast
```

**Iterate Flow:**
```
User on detail page → Clicks "Iterate"
→ Modal opens with textarea
→ User enters change request
→ Submit → POST /api/generate/iterate
→ Server builds prompt with reference image + changes
→ Queue job with BullMQ
→ Response { jobId }
→ Navigate to history
→ Job processes in background
```

### 6. Error Handling

**Delete Operations:**
- If job doesn't exist: 404 error
- If user doesn't own job: 403 Forbidden
- If database error: 500 error with retry option

**Iterate Generation:**
- If reference image URL invalid: Show error, don't submit
- If prompt too long: Validate before submission, show character count
- If generation fails: Same error handling as normal generation

**Detail Page:**
- Job not found: Show 404 page with link back to history
- Failed to load channels/archetypes: Show error, disable form
- Network error: Show retry button

### 7. User Experience

**Feedback:**
- All actions show loading states (spinners, disabled buttons)
- Success toasts for: delete, regenerate queued, iterate queued
- Error toasts with specific messages
- Optimistic updates where possible (remove from UI before API confirms)

**Keyboard Shortcuts:**
- `Ctrl/Cmd + A` - Select all visible jobs
- `Escape` - Clear selection / Close modals
- `Delete` - Delete selected jobs (with confirmation)

**Responsive Design:**
- Mobile: Stack table vertically as cards with actions in dropdown
- Tablet: Full table with smaller action buttons
- Desktop: Full table with all action buttons visible

## Technical Considerations

**Performance:**
- Bulk delete: Batch database operations, don't delete one-by-one
- Image copy: Use Blob API for efficient clipboard operations
- Detail page: Prefetch channels and archetypes data

**Security:**
- All delete operations require ownership check
- Rate limit iterate endpoint (prevent abuse)
- Validate all user inputs server-side

**Database:**
- Add index on `generation_jobs.userId` for faster ownership checks
- Consider soft delete (status='deleted') vs hard delete for audit trail
  - **Decision**: Hard delete for now, add soft delete later if needed

**Accessibility:**
- Checkboxes have proper labels
- Action buttons have aria-labels
- Keyboard navigation works throughout
- Screen reader announces selection count

## Success Criteria

1. ✅ Users can select and bulk delete jobs
2. ✅ Users can delete individual jobs
3. ✅ Users can copy images, details, and prompts
4. ✅ Users can double-click to view job details
5. ✅ Detail page shows large thumbnail and editable fields
6. ✅ Regenerate creates new job with exact same settings
7. ✅ Iterate creates variation based on user's change request
8. ✅ All operations have proper loading/error states
9. ✅ Mobile responsive design works smoothly

## Out of Scope

- Batch regenerate (regenerate multiple jobs at once)
- Job comparison view (side-by-side comparison of iterations)
- Version history (tracking all iterations of a job)
- Undo delete functionality
- Export jobs to CSV/JSON

These can be added in future iterations if needed.

## Implementation Order

1. **Phase 1**: Delete functionality
   - API endpoints for delete
   - Individual delete buttons
   - Bulk delete with selection

2. **Phase 2**: Copy functionality
   - Copy image to clipboard
   - Copy details as text
   - Copy prompt

3. **Phase 3**: Detail page
   - New route and component
   - Double-click navigation
   - Display large thumbnail
   - Editable form

4. **Phase 4**: Regenerate & Iterate
   - Regenerate button with same settings
   - Iterate modal and API endpoint
   - Reference image handling

5. **Phase 5**: Polish
   - Responsive design tweaks
   - Keyboard shortcuts
   - Error handling improvements
   - Loading state polish
