# Titan Thumbnail Generator - Comprehensive Guide

**Version 2.0 | Last Updated: April 29, 2026**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Pricing Structure](#2-pricing-structure)
3. [Settings & Configuration](#3-settings--configuration)
4. [Resolution Options](#4-resolution-options)
5. [Generation Modes](#5-generation-modes)
6. [Credit Calculation](#6-credit-calculation)
7. [Best Practices](#7-best-practices)
8. [Troubleshooting](#8-troubleshooting)
9. [API Integration](#9-api-integration)
10. [Technical Architecture](#10-technical-architecture)

---

## 1. System Overview

### What is Titan Thumbnail Generator?

Titan is an AI-powered YouTube thumbnail generation engine designed to service 50+ channels with automated, branded thumbnails. The system generates consistent, persona-driven thumbnails using layout archetypes and detailed character descriptions.

### Key Features

- **Multi-Channel Support**: Manage unlimited YouTube channels
- **Persona Consistency**: Maintain consistent character appearance across all thumbnails
- **Layout Archetypes**: Pre-designed templates for different content types
- **Dual AI Providers**: AI33 (fast, cost-effective) and Google Gemini (stable, reliable)
- **Flexible Resolutions**: 512, 1K, or 2K quality options
- **Batch Generation**: Process hundreds of thumbnails at once
- **Credit-Based System**: Pay only for what you use

### Core Concepts

**Channels**: Represent individual YouTube channels with unique personas and branding
**Archetypes**: Layout templates that define thumbnail structure and style
**Personas**: Detailed character descriptions ensuring consistent appearance
**Credits**: Virtual currency for thumbnail generation (1 credit ≈ $0.01-$0.10 depending on settings)

---

## 2. Pricing Structure

### Base Credit Costs

The credit system is based on **resolution** and **generation mode**:

| Resolution | Fast Mode (AI33) | Stable Mode (Google) |
|------------|------------------|----------------------|
| **512**    | 1 credit base    | 2 credits base       |
| **1K**     | 2 credits base   | 4 credits base       |
| **2K**     | 3 credits base   | 6 credits base       |

### Reference Image Multipliers

The base cost is multiplied by the number of reference images used:

- **Archetype only**: Base cost × 1
- **Archetype + Persona**: Base cost × 2
- **Archetype + Persona + Logo**: Base cost × 3

### Complete Pricing Matrix

#### Fast Mode (AI33 with 2-minute timeout, falls back to Google)

| Resolution | No Refs | Archetype | Arch + Persona | Arch + Persona + Logo |
|------------|---------|-----------|----------------|-----------------------|
| **512**    | 1       | 1         | 2              | 3                     |
| **1K**     | 2       | 2         | 4              | 6                     |
| **2K**     | 3       | 3         | 6              | 9                     |

#### Stable Mode (Google Gemini direct - 2x cost)

| Resolution | No Refs | Archetype | Arch + Persona | Arch + Persona + Logo |
|------------|---------|-----------|----------------|-----------------------|
| **512**    | 2       | 2         | 4              | 6                     |
| **1K**     | 4       | 4         | 8              | 12                    |
| **2K**     | 6       | 6         | 12             | 18                    |

### Cost Examples in USD

Assuming you're using Google credits ($200 balance):

**Fast Mode Examples:**
- 512 with archetype + persona: 2 credits ≈ $0.02
- 1K with archetype + persona: 4 credits ≈ $0.04
- 2K with all refs (3): 9 credits ≈ $0.09

**Stable Mode Examples:**
- 512 with archetype + persona: 4 credits ≈ $0.04
- 1K with archetype + persona: 8 credits ≈ $0.08
- 2K with all refs (3): 18 credits ≈ $0.18

**With $200 Google credit balance:**
- Stable Mode 1K (standard): ~2,500 thumbnails
- Stable Mode 2K (max quality): ~1,111 thumbnails
- Fast Mode uses AI33 first, saving Google credits for fallback

### Recommended Settings

**Default Configuration (Most Users):**
- Resolution: 1K
- Mode: Stable Mode (Google Gemini)
- Cost: 4 credits per thumbnail with archetype + persona
- Balance: $200 ÷ $0.04 = ~5,000 thumbnails

**Budget-Conscious:**
- Resolution: 512
- Mode: Fast Mode
- Cost: 1-2 credits per thumbnail
- AI33 attempts first, only uses Google on timeout

**Maximum Quality:**
- Resolution: 2K
- Mode: Stable Mode
- Cost: 6-18 credits depending on references
- Guaranteed best quality with Google Gemini

---

## 3. Settings & Configuration

### Accessing Settings

1. Navigate to Dashboard
2. Click **Settings** in the sidebar (above "Main Menu")
3. Configure your preferences

### Available Settings

#### Generation Mode Toggle

**Fast Mode (AI33):**
- ⚡ Icon indicator
- Tries AI33 first (cheaper, faster when working)
- 2-minute timeout before switching to Google Gemini
- Best when: AI33 is performing well, cost is priority

**Stable Mode (Google Gemini):**
- 🔒 Icon indicator
- **DEFAULT SETTING** - Enabled by default
- Goes directly to Google Gemini (skips AI33 entirely)
- 2x credit cost, but maximum reliability
- Best when: AI33 is down/slow, speed is priority, reliability matters more than cost

**Toggle Behavior:**
- Click the toggle to switch modes
- Changes apply immediately to all future generations
- Existing queued jobs use their original settings

#### Resolution Selection

Choose from three quality levels:

**512 Resolution:**
- Lowest quality (512×512)
- Fastest generation
- Smallest file size
- Best for: Quick previews, testing, low-bandwidth

**1K Resolution:**
- **DEFAULT SETTING**
- Standard YouTube thumbnail quality (1280×720)
- Good balance of quality and cost
- Best for: Most YouTube channels, standard content

**2K Resolution:**
- Highest quality (2560×1440)
- Sharpest details
- Largest file size
- Best for: Premium channels, detailed graphics, 4K video content

### Saving Settings

Settings auto-save when you:
- Click a resolution option
- Toggle stable mode
- Wait for the "Settings saved successfully" message

---

## 4. Resolution Options

### Technical Specifications

| Resolution | Dimensions | Aspect Ratio | File Size (avg) | Use Case |
|------------|------------|--------------|-----------------|----------|
| **512**    | 512×512    | 1:1          | 50-150 KB       | Testing, previews |
| **1K**     | 1280×720   | 16:9         | 200-500 KB      | Standard YouTube |
| **2K**     | 2560×1440  | 16:9         | 800 KB-2 MB     | Premium content |

### Visual Quality Comparison

**512 Resolution:**
- Text may appear slightly pixelated
- Adequate for icons and simple graphics
- Not recommended for detailed character art
- Good enough for mobile viewing

**1K Resolution:**
- Crisp text rendering
- Clear character features
- Standard for YouTube (matches most desktop displays)
- Recommended for 95% of use cases

**2K Resolution:**
- Ultra-sharp text
- Fine facial details visible
- Future-proof for 4K displays
- Necessary for print or high-end presentations

### YouTube Recommended Specs

YouTube officially recommends:
- Minimum: 1280×720 (1K) ✓
- Aspect Ratio: 16:9 ✓
- File Size: Under 2MB ✓

All our resolutions meet YouTube's requirements, but **1K is optimal** for most channels.

---

## 5. Generation Modes

### Fast Mode (AI33 + Google Fallback)

**How It Works:**
1. Job submitted to AI33
2. 2-minute timeout timer starts
3. If AI33 completes within 2 minutes → Success (uses AI33 credits)
4. If AI33 times out or errors → Automatically switches to Google Gemini
5. Google Gemini generates the image (uses Google credits)

**Credit Usage:**
- AI33 success: Base credits (1/2/3 depending on resolution)
- AI33 timeout → Google: Uses Google credits (technically ~$0.067)
- **No AI33 credits charged on timeout**

**When to Use:**
- AI33 service is performing well
- Cost is a priority
- You're okay with occasional 2-minute wait
- Testing or non-urgent generations

**Advantages:**
- Lower cost when AI33 works
- Automatic fallback ensures completion
- Best of both worlds

**Disadvantages:**
- 2-minute wait if AI33 is slow
- Unpredictable cost (varies based on AI33 performance)
- May timeout during AI33 outages

### Stable Mode (Google Gemini Direct)

**How It Works:**
1. Job submitted directly to Google Gemini
2. Skips AI33 entirely
3. Usually completes in 15-45 seconds
4. Guaranteed generation with your $200 Google credit balance

**Credit Usage:**
- Always uses 2x base credits
- Predictable cost (you always know what you'll pay)
- Credits come from your $200 Google balance

**When to Use:**
- **DEFAULT RECOMMENDATION**
- AI33 is experiencing downtime
- Speed and reliability are critical
- Batch processing important content
- You have $200 Google credits to burn through

**Advantages:**
- Fast (15-45 seconds typical)
- 100% reliable (Google rarely fails)
- Predictable cost
- No waiting for timeouts

**Disadvantages:**
- 2x credit cost
- Uses Google credit balance faster

### Mode Comparison Table

| Feature              | Fast Mode (AI33)    | Stable Mode (Google) |
|----------------------|---------------------|----------------------|
| **Speed**            | 0-120 seconds       | 15-45 seconds        |
| **Reliability**      | Medium (AI33 varies) | Very High            |
| **Cost**             | 1x base             | 2x base              |
| **Predictability**   | Low                 | High                 |
| **Default Setting**  | No                  | **Yes**              |

---

## 6. Credit Calculation

### Formula

```
Total Credits = (Resolution Base Credits) × (Number of References) × (Stable Mode Multiplier)
```

Where:
- **Resolution Base Credits**: 512=1, 1K=2, 2K=3
- **Number of References**: 1 (archetype only), 2 (arch+persona), 3 (arch+persona+logo)
- **Stable Mode Multiplier**: 1 (Fast Mode), 2 (Stable Mode)

### Worked Examples

#### Example 1: Standard Generation
- **Settings**: 1K resolution, Stable Mode, Archetype + Persona
- **Calculation**: 2 (1K base) × 2 (refs) × 2 (stable) = **8 credits**

#### Example 2: Budget Generation
- **Settings**: 512 resolution, Fast Mode, Archetype only
- **Calculation**: 1 (512 base) × 1 (ref) × 1 (fast) = **1 credit**

#### Example 3: Maximum Quality
- **Settings**: 2K resolution, Stable Mode, All refs (3)
- **Calculation**: 3 (2K base) × 3 (refs) × 2 (stable) = **18 credits**

#### Example 4: Balanced Approach
- **Settings**: 1K resolution, Fast Mode, Archetype + Persona
- **Calculation**: 2 (1K base) × 2 (refs) × 1 (fast) = **4 credits**

### Reference Image Breakdown

**Archetype Only (×1)**:
- Layout template image
- Defines structure, colors, typography
- Minimum requirement for generation

**Archetype + Persona (×2)**:
- Archetype (layout) + Persona (character reference)
- Ensures consistent character appearance
- **Most common configuration**

**Archetype + Persona + Logo (×3)**:
- Full branding package
- Consistent layout + character + brand identity
- Maximum configuration

### Batch Generation Costs

For batch uploads, multiply your per-image cost by the number of images:

**Example: 100 thumbnails, 1K Stable Mode, Archetype + Persona**
- Per-image: 2 × 2 × 2 = 8 credits
- Total: 100 × 8 = **800 credits**
- USD Cost: ~$80 (from your $200 Google balance)

### Monthly Budget Planning

**$200 Google Credit Balance Scenarios:**

| Configuration | Credits Each | Thumbnails | Monthly Output |
|---------------|--------------|------------|----------------|
| 512 Fast, Arch only | 1 | 20,000 | 667/day |
| 1K Fast, Arch+Persona | 4 | 5,000 | 167/day |
| **1K Stable, Arch+Persona** | **8** | **2,500** | **83/day** |
| 2K Stable, All refs | 18 | 1,111 | 37/day |

**Recommended for Most Users:** 1K Stable Mode = ~2,500 high-quality thumbnails from $200 balance

---

## 7. Best Practices

### Optimizing for Cost

1. **Use Fast Mode when AI33 is performing well**
   - Check AI33 status before large batches
   - Switch to Stable Mode if you see timeouts

2. **Choose appropriate resolution**
   - 512: Testing only
   - 1K: 95% of use cases
   - 2K: Premium channels or special content

3. **Minimize reference images when possible**
   - Archetype-only is cheapest (but less consistent)
   - Archetype + Persona is recommended balance
   - Add logo only when branding is critical

4. **Batch process during off-peak hours**
   - AI33 performs better with less load
   - Schedule large batches overnight

### Optimizing for Quality

1. **Always use Stable Mode for important content**
   - Client deliverables
   - Channel launches
   - High-visibility videos

2. **Use 2K for premium channels**
   - Tech review channels (high-res screenshots)
   - Photography/videography content
   - Channels targeting 4K viewers

3. **Include all three references**
   - Maximum consistency
   - Best brand representation
   - Worth the extra cost for flagship content

4. **Test with 512, deliver with 1K/2K**
   - Iterate quickly at low cost
   - Final delivery at high quality

### Persona Description Best Practices

Your persona description is critical for character consistency. Include:

**Essential Details (200+ words)**:
- Age range and gender
- Hair: length, color, style, texture
- Eyes: color, shape, size
- Facial structure: jawline, cheekbones, nose shape, face shape
- Build: height, body type
- Skin tone and complexion
- Facial hair (if applicable)
- Typical expression
- Clothing style

**Example Good Persona**:
```
Male in mid-30s with a strong, athletic build. Short dark brown hair styled
in a modern fade. Piercing blue eyes with slight crow's feet that suggest
frequent smiling. Square jawline with defined cheekbones and a straight nose.
Clean-shaven with olive skin tone. Usually wears fitted tech-casual clothing
- black or gray t-shirts, occasionally button-up shirts. Has an approachable,
confident expression with a slight smile. Stands about 6' tall with broad
shoulders. Lighting tends to be natural and soft, highlighting facial features
without harsh shadows.
```

### Channel Organization

**Naming Convention**:
- Use clear, descriptive channel names
- Example: "TechReviews_JohnDoe" not "Channel1"

**Archetype Library**:
- Create 5-10 archetypes per channel
- Name by purpose: "Tutorial_Layout", "Review_Header", "News_Breaking"
- Test each archetype before bulk use

**Tags and Categories**:
- Use tags to group related channels
- Examples: "Tech", "Finance", "Lifestyle"

---

## 8. Troubleshooting

### Common Issues and Solutions

#### "Insufficient Credits" Error

**Problem**: User doesn't have enough credits for the generation

**Solutions**:
1. Check your credit balance in the dashboard header
2. Contact admin to purchase more credits
3. Reduce resolution (2K → 1K → 512)
4. Switch from Stable Mode to Fast Mode (halves cost)
5. Use fewer reference images

#### "Generation Failed" - AI33 Timeout

**Problem**: AI33 took longer than 2 minutes, Google fallback didn't trigger

**Solutions**:
1. **Enable Stable Mode** (skips AI33 entirely)
2. Check if GOOGLE_API_KEY is set in environment variables
3. Verify you have Google credit balance remaining
4. Retry the generation (will use Stable Mode)

#### "Content Policy Violation" / Safety Filters

**Problem**: Google or AI33 blocked the generation due to content policy

**Causes**:
- Persona reference image contains recognizable public figure
- Prompt contains sensitive/inappropriate terms
- Reference images trigger safety filters

**Solutions**:
1. **Remove persona reference image**, rely on text description only
2. Use AI-generated or stock model photos (not celebrities)
3. Simplify your prompt text
4. Remove any brand logos that might be copyrighted
5. Test with minimal prompt: "Create a YouTube thumbnail"

#### Slow Generation Times

**Problem**: Thumbnails taking 5+ minutes to generate

**Solutions**:
1. **Switch to Stable Mode** (Google is faster than AI33 when it's slow)
2. Check AI33 service status
3. Avoid peak usage hours (9am-5pm ET)
4. Reduce resolution to 512 for faster processing
5. Generate in smaller batches (10-20 at a time)

#### Inconsistent Character Appearance

**Problem**: Persona looks different across thumbnails

**Solutions**:
1. **Expand persona description** to 200+ words with specific details
2. Include more reference images (add persona reference)
3. Use same archetype across similar content
4. Avoid generic descriptions like "man with brown hair"
5. Include lighting and expression details

#### Job Stuck in "Processing"

**Problem**: Job status shows "processing" for 10+ minutes

**Solutions**:
1. Check worker logs: `pm2 logs worker`
2. Restart worker: `pm2 restart worker`
3. Check Redis connection: `redis-cli ping` (should return PONG)
4. Requeue stuck jobs manually via database
5. Contact system admin if persistent

### Error Messages Decoded

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "Insufficient credits" | Not enough balance | Purchase credits or reduce cost |
| "Channel not found" | Invalid channel ID | Verify channel exists |
| "Archetype not found" | Invalid archetype ID | Select existing archetype |
| "Prompt too long" | Exceeds 3800 chars | Shorten custom prompt |
| "Invalid API key" | Google API key issue | Check .env file |
| "AI33 timeout" | AI33 took >2min | Enable Stable Mode |
| "Content blocked" | Safety filter triggered | Remove sensitive content |

---

## 9. API Integration

### API Endpoints

#### POST /api/generate

Generate a single thumbnail or multiple versions

**Request**:
```json
{
  "channelId": "cm5xyz...",
  "archetypeId": "cm5abc...",
  "videoTopic": "How to Build a React App",
  "thumbnailText": "REACT TUTORIAL",
  "customPrompt": "Make it vibrant and colorful",
  "versionCount": 1
}
```

**Response**:
```json
{
  "success": true,
  "jobs": [
    {
      "id": "cm5job123...",
      "status": "pending",
      "channelId": "cm5xyz...",
      "archetypeId": "cm5abc...",
      "credits_deducted": 8
    }
  ],
  "creditsRemaining": 1992
}
```

#### POST /api/batch/upload

Batch upload via CSV or JSON

**CSV Format**:
```csv
channelId,archetypeId,videoTopic,thumbnailText,customPrompt
cm5xyz,cm5abc,"React Tutorial","REACT APP",""
cm5xyz,cm5def,"Vue Tutorial","VUE 3",""
```

**Response**:
```json
{
  "success": true,
  "batchJobId": "cm5batch...",
  "jobCount": 100,
  "creditsDeducted": 800,
  "creditsRemaining": 1200
}
```

#### GET /api/user/preferences

Fetch current user settings

**Response**:
```json
{
  "preferences": {
    "preferredResolution": "1K",
    "stableMode": true,
    "customLanguages": []
  },
  "credits": 2000
}
```

#### PATCH /api/user/preferences

Update user settings

**Request**:
```json
{
  "preferredResolution": "2K",
  "stableMode": false
}
```

**Response**:
```json
{
  "preferences": {
    "preferredResolution": "2K",
    "stableMode": false,
    "customLanguages": []
  }
}
```

### Authentication

All API endpoints require authentication via Next-Auth session cookies.

For programmatic access:
1. Obtain session token via `/api/auth/signin`
2. Include cookie in all subsequent requests
3. Session expires after 30 days of inactivity

### Rate Limits

- **Single generation**: 5 per minute per user
- **Batch upload**: 10 per hour per user
- **Iteration**: 5 per minute per user

Exceeding rate limits returns 429 status with `Retry-After` header.

---

## 10. Technical Architecture

### System Components

#### Frontend (Next.js 16 + React)
- **Dashboard**: `/app/dashboard` - Main user interface
- **Settings**: `/app/dashboard/settings` - User preferences
- **Job History**: Real-time job status tracking
- **Batch Upload**: CSV/JSON processing interface

#### Backend (Next.js API Routes)
- **Generation Routes**: `/app/api/generate/*`
- **Batch Routes**: `/app/api/batch/*`
- **User Routes**: `/app/api/user/*`
- **Admin Routes**: `/app/api/admin/*` (admin-only)

#### Queue System (BullMQ + Redis)
- **Thumbnail Queue**: Processes generation jobs asynchronously
- **Worker**: `/lib/queue/worker.ts` - Job processor
- **Connection**: Redis on port 6379 (production)

#### AI Providers

**Google Gemini** (Primary/Stable Mode):
- Model: `gemini-3.1-flash-image-preview` (Nano Banana 2)
- Cost: ~$0.067 per image
- Speed: 15-45 seconds typical
- Reliability: 99%+

**AI33** (Fast Mode fallback):
- Model: `gemini-3.1-flash-image-preview` via AI33 proxy
- Cost: 1-18 credits depending on config
- Speed: 0-120 seconds (timeout)
- Reliability: 70-90% (varies)

#### Database (PostgreSQL via Prisma)
- **Users**: Authentication, credits, preferences
- **Channels**: YouTube channel configurations
- **Archetypes**: Layout templates
- **Generation Jobs**: Job tracking and history
- **Credit Transactions**: Audit trail

#### Storage (Local Filesystem)
- **Development**: `public/generated/`
- **Production**: `/opt/thumbnail-generator/storage/thumbnails/`
- **File naming**: `{jobId}.png`

### Generation Flow

```
User Request
    ↓
POST /api/generate
    ↓
Fetch user preferences (resolution, stableMode)
    ↓
Calculate credits required
    ↓
Check user balance
    ↓
Deduct credits (atomic transaction)
    ↓
Create generation_jobs record
    ↓
Queue job to BullMQ
    ↓
Worker picks up job
    ↓
[Stable Mode?]
    Yes → Google Gemini directly
    No  → Try AI33 (2min timeout)
          ↓
          Timeout/Error?
          ↓
          Google Gemini fallback
    ↓
Save image to storage
    ↓
Update job status to 'completed'
    ↓
Return outputUrl to user
```

### Credit Transaction Flow

```
User initiates generation
    ↓
Calculate required credits:
  baseCredits = resolution (512=1, 1K=2, 2K=3)
  refMultiplier = numReferences (1-3)
  modeMultiplier = stableMode ? 2 : 1
  total = baseCredits × refMultiplier × modeMultiplier
    ↓
Start database transaction (Serializable isolation)
    ↓
Lock user row (SELECT FOR UPDATE)
    ↓
Check balance >= required
    ↓
Deduct credits
    ↓
Create credit_transactions record
    ↓
Increment total_credits_consumed
    ↓
Commit transaction
    ↓
Return new balance
```

**Note**: Credits are NEVER refunded on failure to prevent exploitation.

### Deployment Architecture

**Production Server**: 65.108.6.149

**Services (PM2)**:
- `thumbnail-app`: Next.js application (port 3000)
- `worker`: BullMQ worker for job processing
- `redis`: Redis server (port 6379)

**Nginx Configuration**:
- Reverse proxy for Next.js app
- SSL/TLS termination
- Upload limit: 10MB
- Domain: thumbnails.schreinercontentsystems.com

**Environment Variables** (`.env`):
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# AI Providers
GOOGLE_API_KEY=AIzaSyDE19EOWG7hBYwviY0ALSJpm4qu3s8Awco
AI33_API_KEY=...

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage
STORAGE_PATH=/opt/thumbnail-generator/storage/thumbnails

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://thumbnails.schreinercontentsystems.com
```

### Performance Characteristics

**Response Times**:
- API endpoint response: <100ms
- Job queueing: <50ms
- Google Gemini generation: 15-45 seconds
- AI33 generation: 30-120 seconds (or timeout)
- Database queries: <10ms

**Throughput**:
- Single worker: ~80 thumbnails/hour (Stable Mode)
- Can scale horizontally with multiple workers
- Limited by AI provider rate limits

**Storage**:
- Average thumbnail size: 200-500 KB (1K), 800KB-2MB (2K)
- 1000 thumbnails ≈ 500 MB storage
- Automatic cleanup not implemented (manual deletion required)

---

## Appendix A: Quick Reference Card

### Credit Costs Cheat Sheet

| Config | Credits | Example |
|--------|---------|---------|
| 512 Fast, 1 ref | 1 | Testing |
| 512 Fast, 2 refs | 2 | Budget persona |
| 512 Stable, 2 refs | 4 | Budget stable |
| **1K Fast, 2 refs** | **4** | **Balanced** |
| **1K Stable, 2 refs** | **8** | **Default** |
| 1K Stable, 3 refs | 12 | Branded stable |
| 2K Fast, 3 refs | 9 | Quality fast |
| 2K Stable, 3 refs | 18 | Maximum quality |

### Keyboard Shortcuts (Dashboard)

- `Ctrl/Cmd + G`: Navigate to Generate tab
- `Ctrl/Cmd + H`: Navigate to History tab
- `Ctrl/Cmd + ,`: Open Settings
- `Ctrl/Cmd + B`: Open Batch Upload

### Support Contacts

- **Technical Issues**: GitHub Issues
- **Billing/Credits**: Admin dashboard
- **API Questions**: API documentation
- **Feature Requests**: GitHub Discussions

---

**End of Guide**

Last Updated: April 29, 2026 | Version 2.0
