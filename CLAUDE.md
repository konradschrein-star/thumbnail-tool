# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Thumbnail Generation Engine designed to service 50+ channels with automated, branded thumbnails using Google's Nano Banana API (gemini-3-pro-image-preview). The system generates consistent, persona-driven thumbnails using layout archetypes and detailed character descriptions.

## IMPORTANT: Deployment Strategy

**We are NOT using Vercel anymore. DO NOT deploy to Vercel.**

- **Production Server:** Self-hosted at 65.108.6.149
- **Deployment Method:** Manual git pull + build on production server
- **NO automatic Vercel deployments** - the project has migrated from Vercel to our own infrastructure
- All git pushes should go to GitHub only, NOT trigger Vercel builds

## Critical Technical Knowledge

### Nano Banana API Integration
- **Model:** `gemini-3-pro-image-preview` (multimodal Gemini, NOT Imagen)
- **SDK:** `@google/genai` (NOT @google/generative-ai)
- **Method:** `generateContent()` with `responseModalities: ["IMAGE"]`
- **Aspect Ratio:** 16:9 via `imageGenerationConfig: { aspectRatio: "16:9" }`
- **API Key:** Stored in `.env` as `GOOGLE_API_KEY`

### Character Consistency Strategy
- **Critical:** Persona descriptions must be 200+ words with 15+ specific attributes
- Include: age, hair (length, color, style), eyes (color), facial structure (jawline, cheekbones, nose, face shape), build, clothing, complexion, facial hair, expression, lighting
- Use archetype-only image references (no persona photos) to avoid safety filters
- Prepend the EXACT same persona description to every generation prompt for a channel

### Architecture
- **Database:** Prisma 5 + PostgreSQL 16 (production), SQLite (development: `prisma/dev.db`)
- **Framework:** Next.js 16 with App Router and Turbopack
- **CSS Framework:** Tailwind CSS v4.2.2 (CSS-based configuration, NOT v3 JS config)
- **Queue System:** BullMQ with Redis 7
- **Image Generation:** Stored locally at `/opt/thumbnail-generator/storage/thumbnails/` on production
- **Test Assets:** Archetype references in `assets/test/`

### Tailwind v4 CSS Configuration

**CRITICAL:** This project uses Tailwind CSS v4, which has fundamentally different configuration than v3.

**Key Differences from v3:**
- Uses `@import "tailwindcss"` instead of `@tailwind` directives
- Configuration is CSS-based using `@theme` blocks, NOT JavaScript `tailwind.config.js`
- Works with `@tailwindcss/postcss` plugin for Next.js 16
- `tailwind.config.js` is optional and minimal (only content paths)

**Configuration Files:**
```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-gray-950: #09090b;
  --color-gray-900: #18181b;
  /* ... more colors ... */
}
```

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},  // NOT 'tailwindcss'
  },
}
```

```javascript
// tailwind.config.js (minimal, v4 style)
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
}
```

**DO NOT:**
- ❌ Use v3 syntax with `module.exports` and `theme.extend` in tailwind.config.js
- ❌ Use `@tailwind base/components/utilities` directives
- ❌ Use `tailwindcss` directly in postcss.config.js

**DO:**
- ✅ Use `@import "tailwindcss"` in CSS files
- ✅ Define custom colors in `@theme` blocks in CSS
- ✅ Use `@tailwindcss/postcss` in postcss.config.js
- ✅ Keep tailwind.config.js minimal with just content paths

### Production Server Access

**Server:** root@65.108.6.149
**Project Directory:** /opt/thumbnail-generator
**SSH Key Location:** //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key

**CRITICAL:** Always use the WSL path format when connecting from Git Bash on Windows:
```bash
# Connect to server
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149

# Run command
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 "cd /opt/thumbnail-generator && git status"

# Copy file to server
scp -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key local-file.txt root@65.108.6.149:/opt/thumbnail-generator/

# Copy file from server
scp -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149:/opt/thumbnail-generator/file.txt ./
```

**Common Mistakes:**
- ❌ Using `~/.ssh/content-forge-key` (won't work from Git Bash on Windows)
- ❌ Omitting the `-i` flag (will fail - no password configured)
- ✅ Always use `//wsl.localhost/Ubuntu/...` path format for WSL keys

## Development Commands

```bash
# Install dependencies
npm install

# Database setup
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Development
npm run dev              # Start Next.js dev server (port 3000)
npx prisma studio        # Open Prisma Studio (port 5556)

# Testing
npm run test:generate    # Run Phase 1 batch generation test
npm run test:api         # Test API endpoints with curl commands

# Type checking
npx tsc --noEmit
```

## Database Schema

### Core Models
- **Channel:** Represents a YouTube channel with unique `personaDescription`
- **Archetype:** Layout templates with style instructions, linked to a Channel
- **GenerationJob:** Tracks thumbnail generation requests and outputs

### Key Relationships
- Each Channel has many Archetypes and GenerationJobs
- Each GenerationJob references one Channel and one Archetype
- Cascade delete: Deleting a Channel removes its Archetypes and Jobs

## API Endpoints

### POST /api/generate
Generate a thumbnail from channel + archetype + content.

**Request:**
```json
{
  "channelId": "cm...",
  "archetypeId": "cm...",
  "videoTopic": "How to master TypeScript",
  "thumbnailText": "MASTER TYPESCRIPT",
  "customPrompt": "optional override"
}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "cm...",
    "outputUrl": "/generated/{jobId}.png",
    "status": "completed"
  }
}
```

### GET /api/channels
List all channels with archetype/job counts.

### POST /api/channels
Create new channel with name and personaDescription.

### GET /api/archetypes?channelId={id}
List archetypes, optionally filtered by channel.

### POST /api/archetypes
Create new archetype with name, channelId, imageUrl, layoutInstructions.

## Key Implementation Files

- **lib/payload-engine.ts** - Payload assembly (encodes images, builds prompts)
- **lib/generation-service.ts** - Nano Banana API client wrapper
- **app/api/generate/route.ts** - Main generation endpoint with job tracking
- **prisma/schema.prisma** - Database schema
- **prisma/seed.ts** - Seeds test channel with proven persona + 7 archetypes

## Common Patterns

### Generating a Thumbnail
1. Create GenerationJob with status='processing'
2. Fetch Channel and Archetype from database
3. Build fullPrompt: `${channel.personaDescription} ${archetype.layoutInstructions}`
4. Assemble payload with base64-encoded archetype image
5. Call `callNanoBanana()` to get image Buffer
6. Save to `public/generated/{jobId}.png`
7. Update GenerationJob with status='completed' and outputUrl

### Adding a New Channel
1. Define detailed persona description (200+ words)
2. Create Channel via POST /api/channels
3. Upload archetype reference images to `assets/test/` or `public/archetypes/`
4. Create Archetypes via POST /api/archetypes with layout instructions
5. Test generation with sample video topics

## Known Issues and Lessons

### Lesson 1: SDK Confusion
- **Wrong:** @google/generative-ai (text generation SDK)
- **Correct:** @google/genai (image generation SDK)
- Always verify SDK package name when working with Google AI models

### Lesson 2: Character Consistency
- Vague persona descriptions produce inconsistent characters across thumbnails
- **Solution:** Use 200-word descriptions with 15+ specific physical attributes
- Store persona in `Channel.personaDescription` and prepend to EVERY prompt

### Lesson 3: Safety Filters
- Persona photos (images of real people) trigger content safety blocks
- **Solution:** Use archetype-only references with detailed text descriptions
- Archetypes should have faces removed/obscured

### Lesson 4: Prisma Version
- Prisma 7 requires complex adapter configuration for LibSQL
- **Decision:** Downgraded to Prisma 5 for simpler SQLite integration
- If upgrading to Prisma 7, expect to configure PrismaLibSql adapter

## Project Status

### ✅ Phase 1 Complete (Proof of Concept)
- Headless generation script with hardcoded data
- Batch generation of 7 thumbnails with consistent persona
- Validated Nano Banana API integration

### ✅ Phase 2 Complete (Database-Backed System)
- Prisma 5 database with Channel/Archetype/Job models
- RESTful API routes for all entities
- End-to-end generation tested successfully

### ✅ Phase 3 Complete (Dashboard UI)
- Full-featured web dashboard at `/dashboard`
- Complete CRUD for channels and archetypes
- Drag-and-drop file upload system
- Thumbnail generation interface with preview
- Job history with filtering
- 32 new files, ~3,500 LOC
- Production-ready (pending authentication)
- See `PHASE3_SUMMARY.md` for details

## Security Notes

- **Never commit:** `.env` file with `GOOGLE_API_KEY`
- **Always validate:** User input in API routes (channelId, archetypeId, etc.)
- **Rate limiting:** Not yet implemented - consider adding for production
- **File upload validation:** ✅ Implemented - validates image types (JPG, PNG, WEBP) and size (max 5MB)

## Troubleshooting

### "Model not found" or 403 errors
- Verify `GOOGLE_API_KEY` is set in `.env`
- Confirm Google Cloud account has billing enabled
- Check API key has access to gemini-3-pro-image-preview model

### Inconsistent character across thumbnails
- Verify persona description is 200+ words with specific attributes
- Confirm `channel.personaDescription` is being prepended to ALL prompts
- Check that exact same Channel is being used for all generations

### Database connection errors
- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate dev` to apply migrations
- Check `prisma/dev.db` file exists and is not corrupted

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
