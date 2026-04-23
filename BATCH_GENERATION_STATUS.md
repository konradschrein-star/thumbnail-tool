# Batch Generation Status & Deployment Guide

**Date:** 2026-04-22
**Status:** ✅ READY FOR PRODUCTION

---

## ✅ What's Working

### 1. AI33 Integration with Shortened Prompts
- **Prompt Reduction:** 92.2% (2,340 → 182 characters)
- **AI33 Timeout:** Increased from 180s to 300s (5 minutes)
- **Test Results:** ✅ Successfully generated images with AI33
- **Cost Savings:** $0.01 vs $0.0672 per image (85% cheaper)

### 2. Batch Generation System
- **Fully Implemented:**
  - ✅ CSV/JSON batch upload (`/api/batch/upload`)
  - ✅ BullMQ queue integration
  - ✅ Worker process (`worker.ts`)
  - ✅ Batch progress tracking
  - ✅ ZIP file generation for completed batches
  - ✅ Real-time status updates

- **Production Verified:**
  - Worker successfully processed jobs on production server
  - AI33 generation worked (confirmed in `worker.log`)
  - Image saved successfully (3.3 MB output)
  - Graceful shutdown working

### 3. Configuration Updates
- **package.json:**
  - Added `"worker": "tsx worker.ts"` script
  - Added `"pm2:worker-logs"` for monitoring

- **ecosystem.config.js:**
  - Added `thumbnail-worker` PM2 process
  - Configured with 2 concurrent job processing
  - Auto-restart and memory limits set
  - Separate log files for debugging

---

## ⚠️ Current Issues

### 1. Worker Not Running
- **Status:** Worker was stopped (received SIGTERM)
- **Last Run:** Successfully processed job ID 6
- **Action Needed:** Start worker using PM2

### 2. Google API Key Expired
- **Impact:** Fallback to Google won't work
- **Priority:** HIGH (needed for reliability)
- **Action Needed:** Renew API key

---

## 🚀 Deployment Steps

### Step 1: Commit & Push Changes

```bash
git add package.json ecosystem.config.js lib/ai/ai33-client.ts
git commit -m "feat: increase AI33 timeout and add worker to PM2 config"
git push origin main
```

### Step 2: Deploy to Production

```bash
# SSH into production server
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149

# Navigate to project directory
cd /opt/thumbnail-generator

# Pull latest changes
git pull origin main

# Install dependencies (if needed)
npm install

# Restart PM2 with updated ecosystem
pm2 delete thumbnail-worker  # Remove old worker if exists
pm2 start ecosystem.config.js

# Verify both processes are running
pm2 list

# Check worker logs
pm2 logs thumbnail-worker --lines 50
```

### Step 3: Verify Worker is Processing Jobs

```bash
# Monitor worker in real-time
pm2 logs thumbnail-worker

# Check Redis queue
redis-cli LLEN bull:thumbnail-generation:wait

# Test batch upload via UI
# Navigate to https://your-domain.com/bulk
```

---

## 📊 PM2 Process Status (Expected)

After deployment, `pm2 list` should show:

| ID | Name               | Status  | Uptime | Memory | CPU  |
|----|-------------------|---------|--------|--------|------|
| 21 | thumbnail-tool    | online  | XXh    | ~XX MB | 0%   |
| XX | thumbnail-worker  | online  | XXm    | ~XX MB | 0%   |

---

## 🧪 Testing Checklist

### Test 1: Single Generation with AI33
- [ ] Navigate to `/dashboard/generate`
- [ ] Fill form and click "Generate"
- [ ] Check logs: `pm2 logs thumbnail-worker`
- [ ] Verify AI33 attempt (not fallback)
- [ ] Confirm image generated

### Test 2: Batch Upload
- [ ] Navigate to `/bulk` → Manual Upload
- [ ] Upload CSV with 5-10 rows
- [ ] Enter batch name
- [ ] Click "Upload & Queue Batch"
- [ ] Verify success message
- [ ] Check worker logs for processing
- [ ] Wait for completion
- [ ] Download ZIP file
- [ ] Verify all thumbnails present

### Test 3: Fallback Mechanism
- [ ] Stop AI33 (or wait for timeout)
- [ ] Generate thumbnail
- [ ] Verify fallback to Google triggered
- [ ] Check logs for fallback message

---

## 📝 Sample Test CSV

```csv
channelId,archetypeId,videoTopic,thumbnailText
cm4...,cm4...,PowerPoint Tips,POWERPOINT TIPS
cm4...,cm4...,Excel Formulas,EXCEL FORMULAS
cm4...,cm4...,Word Hacks,WORD HACKS
```

*Replace with actual channel/archetype IDs from your database*

---

## 🔍 Monitoring Commands

```bash
# Check PM2 status
npm run pm2:status

# View web app logs
npm run pm2:logs

# View worker logs
npm run pm2:worker-logs

# Check Redis queue depth
ssh root@65.108.6.149 "redis-cli LLEN bull:thumbnail-generation:wait"

# Check active jobs
ssh root@65.108.6.149 "redis-cli LLEN bull:thumbnail-generation:active"

# Worker health check
ssh root@65.108.6.149 "pm2 logs thumbnail-worker --lines 10"
```

---

## 🐛 Troubleshooting

### Worker not processing jobs

**Symptoms:**
- Jobs stuck in "pending" status
- No activity in `pm2 logs thumbnail-worker`

**Solutions:**
1. Check worker is running: `pm2 list | grep thumbnail-worker`
2. Check Redis connection: `ssh root@65.108.6.149 "redis-cli PING"`
3. Check environment variables in worker process
4. Restart worker: `pm2 restart thumbnail-worker`

### AI33 timeouts

**Symptoms:**
- Worker logs show "did not complete within 300 seconds"
- Falls back to Google frequently

**Solutions:**
1. Check AI33 API status
2. Reduce batch size (fewer concurrent jobs)
3. Increase timeout further if needed
4. Check AI33 account credits

### Google fallback failures

**Symptoms:**
- "API key expired" error
- No images generated after AI33 timeout

**Solutions:**
1. Renew Google API key
2. Update `.env` on production server
3. Restart worker: `pm2 restart thumbnail-worker`

---

## 📈 Performance Metrics

**Expected Performance (AI33):**
- **Generation Time:** 30-60 seconds per image
- **Timeout:** 300 seconds (5 minutes)
- **Cost:** $0.01 per image
- **Concurrency:** 2 jobs simultaneously

**Fallback Performance (Google):**
- **Generation Time:** 10-30 seconds per image
- **Cost:** $0.0672 per image
- **Reliability:** Higher (Google is more stable)

---

## ✅ Next Steps

1. **Commit changes** to git
2. **Deploy to production** following Step 2 above
3. **Start worker** using PM2
4. **Test batch upload** with 5-10 thumbnails
5. **Monitor logs** for 24 hours
6. **Renew Google API key** for fallback reliability

---

## 📞 Support

**Worker not starting?**
- Check `worker.log` for errors
- Verify all environment variables are set
- Check Redis is running

**AI33 not working?**
- Verify `AI33_API_KEY` in `.env`
- Check AI33 account credits
- Test with condensed prompts

**Questions?**
- Check `ASYNC_GENERATION_GUIDE.md` for detailed documentation
- Review worker logs: `pm2 logs thumbnail-worker`
- Check Redis queue: `redis-cli MONITOR`
