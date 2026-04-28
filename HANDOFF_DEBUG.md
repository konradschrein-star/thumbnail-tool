# Debugging Agent Handoff Document
**Date:** 2026-04-28
**System:** YouTube Thumbnail Generation Engine
**Production URL:** https://thumbnails.schreinercontentsystems.com/
**Server:** root@65.108.6.149 (SSH key: `//wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key`)

---

## Recent Changes Deployed (Today)

### 1. Logo/Subject Integration Feature
- **Database Changes:**
  - Added `featuresLogo` (boolean) to `archetypes` table
  - Added `softwareSubject` (string) to `generation_jobs` table

- **UI Changes:**
  - ArchetypeForm: New "Features Replaceable Logo" checkbox
  - GenerateForm: New "Software/Subject" input field (e.g., "WhatsApp", "Notion")

- **Backend Logic:**
  - When `featuresLogo=true` and `softwareSubject` is provided, prompt includes: "Replace any software logo or branding in the reference image with {softwareSubject}'s official logo, colors, and branding."

- **Files Modified:**
  - `app/dashboard/components/archetypes/ArchetypeForm.tsx`
  - `app/dashboard/components/generate/GenerateForm.tsx`
  - `app/api/archetypes/route.ts` & `app/api/archetypes/[id]/route.ts`
  - `app/api/generate/route.ts` & `app/api/preview-prompt/route.ts`
  - `lib/payload-engine.ts` (buildFullPrompt)
  - `lib/queue/worker.ts` & `lib/queue/thumbnail-queue.ts`

### 2. Character Reference Images Feature
- **Database:** Already had `personaAssetPath` field in channels table
- **UI Changes:**
  - ChannelForm: Added FileUpload for persona reference image
  - GenerateForm: Added persona image preview (60x60 thumbnail below channel selection)

- **Backend Logic:**
  - Worker now encodes persona images and passes to AI generator
  - Uses existing multi-image infrastructure (archetype + persona + logo)

- **Files Modified:**
  - `app/dashboard/components/channels/ChannelForm.tsx`
  - `app/dashboard/components/generate/GenerateForm.tsx`
  - `app/dashboard/components/shared/FileUpload.tsx` (fixed preview sync)
  - `lib/queue/worker.ts`

### 3. Prompt Length Increase
- **Changed from:** 3800 characters → **5000 characters**
- **Updated in 6 locations:**
  1. `lib/payload-engine.ts` - validatePromptLength default
  2. `lib/queue/worker.ts` - Worker validation
  3. `app/api/generate/route.ts` - Main generation endpoint
  4. `app/api/generate/iterate/route.ts` - Iteration endpoint
  5. `app/api/batch/upload/route.ts` - Batch upload
  6. `app/dashboard/components/generate/GenerateForm.tsx` - UI counter

### 4. Image Preview Fixes
- **Problem:** FileUpload preview not syncing when editing channels/archetypes
- **Solution:** Added `useEffect` to sync preview with value prop changes
- **Files:** `app/dashboard/components/shared/FileUpload.tsx`

### 5. Enhanced Safety Filter Error Messages
- **Problem:** Generic "blocked by safety filters" didn't help users
- **Solution:** Intelligent error detection identifying which image (persona/archetype) triggered rejection
- **New Error Messages:**
  - Persona image rejected: "Your persona reference image may contain identifiable people or faces. Please try: (1) Different image without clear faces, (2) Remove persona image, (3) Use illustrated/cartoon reference"
  - Archetype rejected: "Your archetype reference image may be triggering content policies..."
- **Files:** `lib/queue/worker.ts`

---

## Current System Architecture

### Technology Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** PostgreSQL 16 (Supabase) - Prisma ORM
- **CSS:** Tailwind CSS v4 (CSS-based config, NOT v3)
- **Queue:** BullMQ with Redis 7
- **Image Generation:** Google Nano Banana API (`gemini-3-pro-image-preview`)
- **Storage:** Local filesystem at `/opt/thumbnail-generator/storage/`

### Critical Configuration Files
- **Prisma Schema:** `prisma/schema.prisma`
- **Next.js Config:** `next.config.js`
- **Tailwind:** `app/globals.css` (uses `@theme` blocks, NOT tailwind.config.js)
- **Environment:** `.env` (contains DATABASE_URL, GOOGLE_API_KEY, REDIS_PORT=6379)

### Key Directories
- **Frontend:** `app/dashboard/`
- **API Routes:** `app/api/`
- **Core Logic:** `lib/`
- **Queue System:** `lib/queue/`
- **AI Clients:** `lib/ai/`
- **Storage:** `public/storage/` (dev), `/opt/thumbnail-generator/storage/` (prod)

### PM2 Services (Production)
1. **thumbnail-tool** - Main Next.js web app (port 3000)
2. **thumbnail-worker** - BullMQ job processor
3. **worker-orchestrator** - Orchestration service
4. **worker-render** - Render worker
5. **hub-web** - Hub interface

---

## Known Issues & Debugging Priorities

### 1. **Logo Replacement Testing**
**Status:** Deployed but needs testing
**Test Steps:**
1. Create/edit archetype → Check "Features Replaceable Logo"
2. Generate thumbnail → Enter software subject (e.g., "WhatsApp")
3. Verify prompt includes logo replacement instruction
4. Check generated thumbnail has correct logo

**Potential Issues:**
- Logo replacement instruction might be too vague for AI
- Need to test with multiple software brands (WhatsApp, Notion, PowerPoint, etc.)
- May need to adjust prompt wording for better results

**Debug Commands:**
```bash
# Check job data in database
psql $DATABASE_URL -c "SELECT id, softwareSubject, promptUsed FROM generation_jobs ORDER BY createdAt DESC LIMIT 5;"

# Check worker logs
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "pm2 logs thumbnail-worker --lines 50"
```

### 2. **Persona Image Safety Filter Rejections**
**Status:** Enhanced error messages deployed, needs monitoring
**Expected Behavior:**
- Photos with clear faces → Should trigger safety filter
- Should see improved error message with specific guidance

**Test Steps:**
1. Upload persona image with clear human face
2. Generate thumbnail
3. Verify error message is specific and helpful (not generic)

**Debug Commands:**
```bash
# Check failed jobs with error messages
psql $DATABASE_URL -c "SELECT id, channelId, status, errorMessage FROM generation_jobs WHERE status='failed' ORDER BY createdAt DESC LIMIT 10;"

# Check worker error logs
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "pm2 logs thumbnail-worker --err --lines 100"
```

### 3. **Image Preview Display Issues**
**Status:** Fixed but needs verification
**Test Steps:**
1. Edit channel → Upload persona image → Verify preview shows immediately
2. Edit archetype → Upload reference image → Verify preview shows
3. Generate form → Select channel with persona → Verify persona preview appears
4. Generate form → Select archetype → Verify archetype preview appears

**Files to Check:**
- `app/dashboard/components/shared/FileUpload.tsx` (useEffect sync)
- `app/dashboard/components/generate/GenerateForm.tsx` (persona preview card)

### 4. **Prompt Length Validation**
**Status:** Increased to 5000, needs testing
**Test Steps:**
1. Create very long persona description (2000+ chars)
2. Add long layout instructions (1000+ chars)
3. Add custom prompt (1500+ chars)
4. Total should be under 5000 → Should work
5. Total over 5000 → Should show clear error

**Debug Commands:**
```bash
# Check for prompt length errors
psql $DATABASE_URL -c "SELECT id, errorMessage FROM generation_jobs WHERE errorMessage LIKE '%too long%' ORDER BY createdAt DESC LIMIT 5;"
```

### 5. **Resolution Verification**
**Status:** Confirmed at 1K, needs verification
**Current Config:** `resolution: "1K"` in `lib/ai/google-client.ts` line 161
**Expected Output:** ~1792x1008 pixels (16:9 aspect ratio)

**Test Steps:**
1. Generate a thumbnail
2. Download generated image
3. Check actual pixel dimensions (should be ~1792x1008)
4. If different, check Google API response

**Debug Commands:**
```bash
# Check recent generation metadata
psql $DATABASE_URL -c "SELECT id, metadata FROM generation_jobs WHERE status='completed' ORDER BY createdAt DESC LIMIT 5;"

# SSH to server and check actual file dimensions
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "identify /opt/thumbnail-generator/storage/thumbnails/*.png | tail -5"
```

---

## Testing Workflow

### Quick Health Check
```bash
# 1. Check if all PM2 services are running
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "pm2 status"

# 2. Check web app accessibility
curl -I https://thumbnails.schreinercontentsystems.com/

# 3. Check Redis connection
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "redis-cli -p 6379 ping"

# 4. Check recent job status
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM generation_jobs WHERE createdAt > NOW() - INTERVAL '1 hour' GROUP BY status;"
```

### Full Feature Test Plan

#### Test 1: Logo Replacement Feature
1. Navigate to Archetypes page
2. Create new archetype with "Features Replaceable Logo" checked
3. Navigate to Generate page
4. Select channel + new archetype
5. Enter software subject: "WhatsApp"
6. Generate thumbnail
7. **Verify:** Prompt includes logo replacement instruction
8. **Verify:** Generated thumbnail has WhatsApp-like logo/colors

#### Test 2: Persona Reference Images
1. Navigate to Channels page
2. Edit existing channel or create new
3. Upload persona reference image (try both: photo and illustration)
4. Navigate to Generate page
5. Select channel with persona image
6. **Verify:** Persona preview appears below channel selector (60x60 thumbnail)
7. Generate thumbnail
8. **Verify:** Character consistency improved vs text-only

#### Test 3: Safety Filter Handling
1. Upload persona image with clear human face
2. Try to generate thumbnail
3. **Verify:** Error message is specific (mentions persona image, provides solutions)
4. Remove persona image, try again
5. **Verify:** Generation succeeds without persona image

#### Test 4: Long Prompts
1. Create channel with 2000-character persona description
2. Create archetype with 1000-character layout instructions
3. Add 1500-character custom prompt
4. **Verify:** Character counter shows X/5000
5. **Verify:** Generation succeeds (total < 5000)
6. Try with 5100-character total
7. **Verify:** Shows error before generation

---

## Common Debugging Scenarios

### Scenario 1: Jobs Stuck in "Processing"
**Symptoms:** Jobs show "processing" status but never complete
**Possible Causes:**
- Worker not running
- Redis connection lost
- Worker crashed mid-process

**Debug Steps:**
```bash
# Check worker status
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "pm2 status thumbnail-worker"

# Check worker logs
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "pm2 logs thumbnail-worker --lines 100"

# Check Redis queue
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "redis-cli -p 6379 KEYS 'bull:thumbnail-generation:*'"

# Restart worker
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "pm2 restart thumbnail-worker"
```

### Scenario 2: Safety Filter False Positives
**Symptoms:** Legitimate content getting blocked
**Possible Causes:**
- Reference images contain faces/people
- Prompt text has marketing/bold language
- Combination of images + text triggers filter

**Debug Steps:**
1. Check error message in job record
2. Review reference images (archetype + persona)
3. Try without persona image
4. Try with different archetype
5. Simplify prompt text

### Scenario 3: Generated Images Wrong Size
**Symptoms:** Images not 1K (~1792x1008)
**Possible Causes:**
- API not respecting resolution config
- Wrong model being used
- Fallback model has different resolution

**Debug Steps:**
```bash
# Check actual image dimensions
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "identify -format '%f: %wx%h\n' /opt/thumbnail-generator/storage/thumbnails/*.png | tail -5"

# Check worker logs for which model was used
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "pm2 logs thumbnail-worker | grep 'Calling'"

# Verify configuration
grep -n "resolution" lib/ai/google-client.ts
```

### Scenario 4: Preview Images Not Loading
**Symptoms:** Uploaded images don't show in edit forms
**Possible Causes:**
- FileUpload useEffect not syncing
- Image path incorrect
- CORS/permissions issue

**Debug Steps:**
1. Check browser console for errors
2. Verify image URL in network tab
3. Check database for correct personaAssetPath/imageUrl
4. Test direct image URL access

---

## Important Notes for Debugging Agent

### 1. **Deployment Process**
Always deploy with this command:
```bash
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 \
  "cd /opt/thumbnail-generator && git pull && npm install && npm run build && pm2 restart all"
```

### 2. **Database Access**
```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Common queries
SELECT * FROM channels ORDER BY createdAt DESC LIMIT 5;
SELECT * FROM archetypes ORDER BY createdAt DESC LIMIT 5;
SELECT * FROM generation_jobs WHERE status='failed' ORDER BY createdAt DESC LIMIT 10;
```

### 3. **Redis Connection**
- **Port:** 6379 (NOT 6380 or 6382)
- **Config:** `lib/queue/connection.ts`
- Always verify `REDIS_PORT=6379` in `.env`

### 4. **Tailwind CSS v4**
- Uses `@import "tailwindcss"` (NOT `@tailwind` directives)
- Configuration in `@theme` blocks in CSS files
- `postcss.config.js` uses `@tailwindcss/postcss` plugin
- **DO NOT** use v3 JavaScript config syntax

### 5. **Memory Documentation**
- Auto-memory at: `C:\Users\konra\.claude\projects\C--Users-konra-OneDrive-Projekte-20260224-Thumbnail-Creator-V2\memory\MEMORY.md`
- Update with new issues/solutions discovered during debugging

---

## Key Files Reference

### Frontend Components
- `app/dashboard/components/generate/GenerateForm.tsx` - Main generation interface
- `app/dashboard/components/channels/ChannelForm.tsx` - Channel creation/edit
- `app/dashboard/components/archetypes/ArchetypeForm.tsx` - Archetype creation/edit
- `app/dashboard/components/shared/FileUpload.tsx` - File upload with preview
- `app/dashboard/components/shared/Input.tsx` - Form input component

### API Routes
- `app/api/generate/route.ts` - Main generation endpoint (POST)
- `app/api/generate/iterate/route.ts` - Iteration/redo endpoint
- `app/api/channels/[id]/route.ts` - Channel CRUD (GET/PATCH/DELETE)
- `app/api/archetypes/[id]/route.ts` - Archetype CRUD
- `app/api/preview-prompt/route.ts` - Prompt preview for UI

### Core Logic
- `lib/queue/worker.ts` - BullMQ job processor (WHERE GENERATION HAPPENS)
- `lib/ai/google-client.ts` - Nano Banana API client (resolution config here)
- `lib/ai/image-generator.ts` - Unified generator interface
- `lib/payload-engine.ts` - Prompt building (buildFullPrompt)
- `lib/queue/thumbnail-queue.ts` - Job queue configuration

### Database
- `prisma/schema.prisma` - Database schema (check here for fields)
- `lib/prisma.ts` - Prisma client singleton

---

## Success Criteria for Debugging Session

### High Priority ✅
1. [ ] Verify logo replacement feature works with at least 3 different software brands
2. [ ] Confirm persona reference images improve character consistency
3. [ ] Validate safety filter error messages are helpful and specific
4. [ ] Test prompt length limits (both under and over 5000 chars)
5. [ ] Verify image previews load correctly in all forms

### Medium Priority ⚠️
1. [ ] Check generated image dimensions are ~1792x1008 (1K resolution)
2. [ ] Test with various persona image types (photo vs cartoon)
3. [ ] Verify all 3 features work together (logo + persona + long prompt)
4. [ ] Check worker error logging is detailed enough
5. [ ] Monitor job queue for any stuck/stalled jobs

### Nice to Have 💡
1. [ ] Performance testing (generation time with/without persona images)
2. [ ] Check fallback model usage frequency
3. [ ] Review PM2 logs for any warnings
4. [ ] Test batch generation with new features
5. [ ] Verify mobile UI displays previews correctly

---

## Contact & Resources

- **Production URL:** https://thumbnails.schreinercontentsystems.com/
- **GitHub:** Check commits from 2026-04-28 for today's changes
- **Server SSH:** `ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149`
- **Project Path (Server):** `/opt/thumbnail-generator`
- **Project Path (Local):** `C:\Users\konra\OneDrive\Projekte\20260224 Thumbnail Creator V2`

## Recent Commits to Review
1. `feat: add logo replacement, persona images, and increase prompt limit` - Main feature implementation
2. `fix: improve image preview and safety filter error handling` - Bug fixes

---

**Good luck with debugging! Focus on the High Priority checklist first. 🚀**
