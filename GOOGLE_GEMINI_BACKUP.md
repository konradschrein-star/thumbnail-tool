# Google Gemini Backup Integration

## Overview

Updated the image generation system to use **Google Gemini as the reliable primary backup** for AI33 with aggressive timeout handling.

## New Strategy

### 1. AI33 with 2-Minute Timeout
- Attempt AI33 generation first (still uses your AI33 credits)
- **Hard timeout: 2 minutes**
- If completes within 2 minutes → success, return AI33 result

### 2. Immediate Google Gemini Fallback
Switches to Google Gemini immediately if:
- **AI33 takes longer than 2 minutes** (timeout)
- **AI33 returns API error** (500, 503, timeout, server error, etc.)
- **AI33 returns auth error** (401, 403, invalid key)

Does NOT switch for:
- **Content policy violations** (safety filters, blocked content) - these fail immediately
- These are prompt/content issues, not API issues

### 3. Google Gemini as Reliable Backup
- Uses your $200 Google credits
- Nano Banana 2 (Flash) model: `gemini-3.1-flash-image-preview`
- Cost: ~$0.067 per image
- Highly reliable, rarely fails

## Setup Instructions

### 1. Add Google API Key to `.env`

Add this line to your `.env` file (both local and production):

```bash
GOOGLE_API_KEY=AIzaSyDE19EOWG7hBYwviY0ALSJpm4qu3s8Awco
```

### 2. Production Deployment

SSH into production and update the `.env` file:

```bash
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149

# Edit .env file
cd /opt/thumbnail-generator
nano .env

# Add the GOOGLE_API_KEY line, then save (Ctrl+X, Y, Enter)

# Restart services
pm2 restart all
```

## How It Works

### Scenario 1: AI33 Success (< 2 minutes)
```
[Start] → AI33 (0-120s) → ✓ Success
Cost: AI33 credits only (1-9 credits depending on refs + resolution)
```

### Scenario 2: AI33 Timeout (> 2 minutes)
```
[Start] → AI33 (120s) → ✗ Timeout → Google Gemini → ✓ Success
Cost: $0.067 (Google credits)
Note: AI33 attempt is abandoned, no AI33 credits charged
```

### Scenario 3: AI33 API Error
```
[Start] → AI33 → ✗ API Error (503, 500, auth) → Google Gemini → ✓ Success
Cost: $0.067 (Google credits)
```

### Scenario 4: Content Policy Violation
```
[Start] → AI33 → ✗ Safety Filter → [FAIL - No fallback]
Error: "Content policy violation: ..."
Note: These are prompt issues, not API issues. No fallback attempted.
```

## Benefits

1. **Reliability**: Google Gemini is extremely reliable with your $200 credit balance
2. **Speed**: 2-minute max wait before switching to backup
3. **Cost-Effective**: Still tries AI33 first (cheaper), only uses Google when needed
4. **User Experience**: No more 10-minute waits for AI33 to timeout

## Monitoring

Job metadata now includes:
- `provider`: 'ai33' or 'google'
- `fallbackUsed`: boolean
- `fallbackMessage`: Reason for fallback (e.g., "AI33 timeout - used Google Gemini as backup")

Check the job history table to see which provider was used for each generation.

## Cost Comparison

| Scenario | AI33 Cost | Google Cost | Total |
|----------|-----------|-------------|-------|
| AI33 success (1K, no refs) | 1 credit ($0.01) | $0 | $0.01 |
| AI33 success (2K, 3 refs) | 9 credits ($0.09) | $0 | $0.09 |
| AI33 timeout → Google | $0 | $0.067 | $0.067 |
| AI33 error → Google | $0 | $0.067 | $0.067 |

**Conclusion**: Google backup is slightly more expensive than AI33, but much more reliable. With $200 credit balance, you have ~3,000 generations available as backup.

## Troubleshooting

### Error: "GOOGLE_API_KEY environment variable is required"
- Make sure you added `GOOGLE_API_KEY` to your `.env` file
- Restart the application after adding the key

### All generations using Google (not trying AI33)
- Check if `AI33_API_KEY` is set in `.env`
- System will skip AI33 if the key is missing or invalid

### Google Gemini fails
- Verify the API key is correct
- Check Google Cloud Console for quota/billing issues
- Make sure you have credits remaining
