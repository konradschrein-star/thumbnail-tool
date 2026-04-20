# Production Deployment Guide

This document provides step-by-step instructions for deploying the Thumbnail Generator to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Redis Setup](#redis-setup)
5. [Authentication Configuration](#authentication-configuration)
6. [Storage Configuration](#storage-configuration)
7. [Deployment Options](#deployment-options)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All sensitive data is removed from the codebase
- [ ] `.env` files are never committed to version control
- [ ] All dependencies are up to date: `npm audit`
- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] All tests pass: `npm test`
- [ ] Redis and PostgreSQL services are running
- [ ] API keys and credentials are obtained from all providers
- [ ] Domain name is configured and DNS is pointing to your deployment
- [ ] SSL/TLS certificate is configured
- [ ] CORS and security headers are properly configured

---

## Environment Setup

### 1. Generate Required Secrets

Generate cryptographically secure values for authentication and encryption:

```bash
# NextAuth secret
openssl rand -base64 32

# Encryption key for OAuth tokens
openssl rand -hex 32

# Database password (if using Docker)
openssl rand -base64 20
```

### 2. Create Production Environment File

Create a `.env.production.local` file (never commit this):

```bash
# Copy from .env.example and fill in actual values
cp .env.example .env.production.local

# Edit with your production values
nano .env.production.local
```

### 3. Essential Environment Variables

```env
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=postgresql://user:password@host:5432/db
REDIS_HOST=your-redis-host
GOOGLE_API_KEY=your-key
AI33_API_KEY=your-key
ENCRYPTION_KEY=your-hex-key
NEXTAUTH_SECRET=your-base64-secret
```

---

## Database Setup

### Option 1: Managed PostgreSQL (Recommended for Production)

Popular options:
- **Railway**: Simple UI, auto-backups, cost-effective
- **Supabase**: PostgreSQL + Auth + Real-time capabilities
- **AWS RDS**: Enterprise-grade, highly available
- **Heroku Postgres**: Simple integration, addon management

#### Steps for Railway:

1. Sign up at https://railway.app
2. Create a new project
3. Add PostgreSQL plugin
4. Get connection string from the plugin dashboard
5. Set as `DATABASE_URL` and `DIRECT_URL` in your environment

#### Steps for Supabase:

1. Create project at https://supabase.com
2. Get connection string from Project Settings > Database
3. For connection pooling:
   - Use `postgresql://...?schema=public` (with pooling)
   - Use direct connection for migrations (separate URL)

### Option 2: Docker Compose (Self-Hosted)

```bash
# Ensure docker-compose.yml exists with PostgreSQL service
docker-compose up -d postgres

# Verify database is running
docker-compose logs postgres

# Create database
docker-compose exec postgres createdb -U postgres thumbnail_generator
```

### Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional, for test data)
npx prisma db seed
```

### Verify Database Connection

```bash
# Open Prisma Studio
npx prisma studio

# Should display your database tables
```

---

## Redis Setup

### Option 1: Managed Redis (Recommended)

Popular options:
- **Upstash**: Serverless Redis, excellent for hobby/startup projects
- **Redis Cloud**: Professional Redis hosting
- **AWS ElastiCache**: Enterprise-grade Redis
- **Railway Redis**: Integrated with Railway PostgreSQL

#### Steps for Upstash:

1. Create account at https://upstash.com
2. Create a Redis database
3. Copy connection string: `rediss://user:password@host:port`
4. Set as environment:
   ```env
   REDIS_HOST=host
   REDIS_PORT=port
   REDIS_PASSWORD=password
   ```

#### Steps for Redis Cloud:

1. Create account at https://redis.com
2. Create database on cloud
3. Use the provided connection string
4. Enable TLS for secure connection

### Option 2: Docker Compose (Self-Hosted)

```bash
# Start Redis from docker-compose.yml
docker-compose up -d redis

# Verify Redis is running
docker-compose logs redis

# Test connection
redis-cli -h localhost -p 6380 ping
# Should return: PONG
```

---

## Authentication Configuration

### 1. NextAuth.js Setup

#### Local Development
- Uses JWT tokens stored in secure cookies
- Works with any OAuth provider (Google, GitHub, etc.)

#### Production Requirements

```env
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://yourdomain.com
```

#### Session Configuration

- **Secure cookies**: Automatically enabled on HTTPS
- **CSRF protection**: Automatically enabled
- **Session timeout**: Configure in `app/auth/[...nextauth]/route.ts`

### 2. Google OAuth Setup (for Sheets Integration)

#### Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable APIs:
   - Google Sheets API
   - Google Drive API
4. Create OAuth 2.0 credentials (OAuth consent screen + credentials)

#### Configure Authorized Redirect URIs

```
https://yourdomain.com/api/sheets/callback
https://yourdomain.com/api/auth/callback/google  (if using Google as auth provider)
```

#### Set Environment Variables

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
```

### 3. User Access Management

The system has three user roles:

- **USER**: Regular users with rate limits (10 manual generations/day)
- **ADMIN**: Can access all features and archetypes
- **SUPERUSER**: Full system access

#### Creating Users

```bash
# Use admin panel or direct database access
# Users created via /api/auth/register are initially pending
# Admins must approve via access_requests table
```

---

## Storage Configuration

### Option 1: Local Storage (Development/Small Scale)

```env
STORAGE_PATH=/opt/thumbnail-generator/storage/thumbnails
STORAGE_RETENTION_DAYS=30
```

**For Production on Vercel/Serverless:**
- Local storage won't persist between function invocations
- Use cloud storage instead (see below)

### Option 2: AWS S3 (Recommended for Cloud)

```bash
# Install AWS SDK (should already be in dependencies)
npm install @aws-sdk/client-s3

# Set environment variables
export AWS_S3_BUCKET=your-bucket-name
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

**Bucket Configuration:**
```json
{
  "Versioning": { "Status": "Enabled" },
  "LifecycleConfiguration": {
    "Rules": [{
      "Id": "cleanup-old-thumbnails",
      "Status": "Enabled",
      "Expiration": { "Days": 30 },
      "Filter": { "Prefix": "thumbnails/" }
    }]
  }
}
```

### Option 3: Google Cloud Storage

```bash
# Install GCS SDK
npm install @google-cloud/storage

# Set environment variables
export GCS_BUCKET=your-bucket
export GCS_PROJECT_ID=your-project
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Option 4: Cloudinary (Image CDN)

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Benefits:**
- Automatic image optimization
- CDN distribution
- Image transformations
- No need to manage your own storage

---

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

#### Setup

1. Push code to GitHub
2. Go to https://vercel.com and sign up
3. Import your repository
4. Configure environment variables in Vercel dashboard
5. Deploy

#### Environment Variables in Vercel Dashboard

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
REDIS_HOST=...
REDIS_PORT=...
GOOGLE_API_KEY=...
AI33_API_KEY=...
... (all from .env.example)
```

#### Special Considerations

- **Cold starts**: May affect first generation requests
- **Timeout**: Function timeout is 60s (requests must complete quickly)
- **Storage**: Use cloud storage (S3, GCS) not local filesystem
- **Cron jobs**: Use `/api/cron/...` endpoints with Vercel Cron

#### Deploy Command

```bash
# Vercel CLI
vercel deploy --prod

# Or push to main branch in GitHub to auto-deploy
```

### Option 2: Railway

#### Setup

1. Create project at https://railway.app
2. Connect GitHub repository
3. Add PostgreSQL and Redis services
4. Configure environment variables

#### Deploy

```bash
# Using Railway CLI
railway up

# Or push to main branch for auto-deploy
```

### Option 3: Docker Compose (Self-Hosted)

#### Prepare Docker Compose

```bash
# Ensure docker-compose.yml includes:
# - next.js app service
# - postgresql service
# - redis service

docker-compose up -d
```

#### Docker Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Database backup
docker-compose exec postgres pg_dump -U postgres thumbnail_generator > backup.sql
```

### Option 4: AWS (ECS/AppRunner)

#### ECS with Docker

1. Create ECR repository
2. Build and push Docker image
3. Create ECS cluster and service
4. Configure RDS for PostgreSQL
5. Configure ElastiCache for Redis
6. Set environment variables via ECS task definition

#### AppRunner (Simpler)

1. Connect GitHub repository
2. Specify Dockerfile
3. Configure environment variables
4. Deploy

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-04-20T...",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "nodejs": { "status": "ok" }
  }
}
```

### 2. Authentication

```bash
# Test sign up
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test sign in
curl -X POST https://yourdomain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 3. API Endpoints

```bash
# Test channels endpoint (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://yourdomain.com/api/channels

# Test generation endpoint
curl -X POST https://yourdomain.com/api/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "xxx",
    "archetypeId": "yyy",
    "videoTopic": "How to code",
    "thumbnailText": "LEARN CODING"
  }'
```

### 4. Database

```bash
# Verify migrations applied
npx prisma migrate status

# Check database connections
npx prisma studio
```

### 5. Queue Status

```bash
# Check queue stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://yourdomain.com/api/queue/stats
```

---

## Monitoring & Maintenance

### 1. Logging

Enable structured logging:

```env
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

**Recommended logging services:**
- LogRocket (frontend + backend)
- DataDog (comprehensive monitoring)
- Sentry (error tracking)
- LogTail (simple log aggregation)

### 2. Metrics

Monitor these key metrics:

- Request latency (target: < 2s for UI, < 30s for generation)
- Error rate (target: < 1%)
- Queue depth (pending jobs)
- Database connections (should be stable)
- Redis memory usage
- Storage usage

### 3. Backups

**Database Backups:**
```bash
# Weekly automated backups
# Use managed service backups or:
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h $DB_HOST -U $DB_USER $DB_NAME < backup_20240420.sql
```

**Storage Backups:**
- Enable versioning in S3/GCS
- Archive old thumbnails to cheaper storage tier
- Set lifecycle policies to delete after 30 days

### 4. Updates & Patches

```bash
# Check for dependency updates
npm outdated

# Update dependencies safely
npm update

# Audit for vulnerabilities
npm audit
npm audit fix

# Deploy updates
git push main  # Or redeploy through your platform
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Symptom:** `ECONNREFUSED` or `database error`

**Solutions:**
```bash
# Check database is running
pg_isready -h $DB_HOST -p $DB_PORT

# Test connection string
psql $DATABASE_URL -c "SELECT 1"

# Verify environment variables
echo $DATABASE_URL
echo $DIRECT_URL

# Check migrations
npx prisma migrate status
```

#### 2. Redis Connection Errors

**Symptom:** `ECONNREFUSED` or queue jobs not processing

**Solutions:**
```bash
# Check Redis is running
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# Check queue jobs
redis-cli -h $REDIS_HOST -p $REDIS_PORT KEYS "*"

# Monitor Redis
redis-cli -h $REDIS_HOST -p $REDIS_PORT MONITOR
```

#### 3. Generation Jobs Failing

**Symptom:** Jobs stuck in "processing" or "failed" status

**Solutions:**
```bash
# Check API key validity
curl -H "Authorization: Bearer $GOOGLE_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent

# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker

# Check queue for stuck jobs
redis-cli -h $REDIS_HOST -p $REDIS_PORT LLEN "bull:thumbnail-generation:active"
```

#### 4. High Memory Usage

**Symptom:** Application becomes slow or crashes

**Solutions:**
```bash
# Check Node.js memory
node -e "console.log(process.memoryUsage())"

# Increase heap size (if using Node.js)
NODE_OPTIONS="--max-old-space-size=2048" npm start

# Check for memory leaks
# Use monitoring tools like Clinic.js or 0x
npx clinic doctor -- npm start
```

#### 5. Rate Limiting Too Strict

**Symptom:** Users getting "rate limit exceeded" errors

**Solutions:**
```env
# Adjust rate limit settings
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100

# Or disable for development
RATE_LIMIT_ENABLED=false
```

### Emergency Procedures

#### Rollback to Previous Version

```bash
# Vercel
vercel rollback

# Docker
git revert HEAD
docker-compose up -d --build

# Railway
# Use deployment history in dashboard
```

#### Clear Queue (if stuck)

```bash
# WARNING: This deletes all pending jobs
redis-cli -h $REDIS_HOST -p $REDIS_PORT DEL bull:thumbnail-generation:*

# Verify
redis-cli -h $REDIS_HOST -p $REDIS_PORT KEYS "*"
```

#### Database Emergency Recovery

```bash
# Connect directly to database
psql $DATABASE_URL

# Check job table
SELECT id, status, created_at FROM generation_jobs ORDER BY created_at DESC LIMIT 10;

# Reset stuck jobs
UPDATE generation_jobs SET status = 'failed' WHERE status = 'processing' AND created_at < NOW() - INTERVAL '1 hour';
```

---

## Performance Tuning

### 1. Database Connection Pooling

```env
# Use connection pooling URL (not direct)
DATABASE_URL=postgresql://...?schema=public
```

### 2. Redis Optimization

```env
# Increase Redis timeout for slow networks
REDIS_SOCKET_TIMEOUT=5000

# Adjust queue settings in lib/queue/thumbnail-queue.ts
```

### 3. Image Generation Optimization

- Cache generated images by content hash
- Implement batch processing for similar requests
- Use CDN for generated images

### 4. Next.js Optimization

```javascript
// next.config.js
module.exports = {
  compress: true,
  productionBrowserSourceMaps: false,
  swcMinify: true,
};
```

---

## Security Hardening

### 1. CORS Configuration

```typescript
// app/api/middleware.ts
const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];

export function corsMiddleware(origin: string) {
  return allowedOrigins.includes(origin);
}
```

### 2. Security Headers

```typescript
// next.config.js or API routes
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  }
];
```

### 3. API Rate Limiting

- Implemented via `lib/rate-limit.ts`
- Per-user limits: 10 manual generations/day
- Per-IP limits: 100 requests/15 minutes
- Adjust based on your deployment scale

### 4. Secrets Management

**Never:**
- Hardcode API keys
- Commit `.env` files
- Log sensitive data
- Expose errors with full stack traces

**Always:**
- Use platform secret management (Vercel, Railway, etc.)
- Rotate credentials periodically
- Use OAuth instead of password storage
- Implement proper error handling

---

## Costs Estimation

Rough monthly costs for production deployment (50 concurrent users):

| Service | Cost | Notes |
|---------|------|-------|
| PostgreSQL (managed) | $15-50 | Railway/Supabase |
| Redis (managed) | $5-25 | Upstash/Redis Cloud |
| Compute (Vercel/Railway) | $10-50 | Pay-as-you-go |
| Storage (S3/GCS) | $1-10 | 1000 images/month |
| **Total** | **$30-135** | Can scale down/up |

---

## Support & Resources

- **Documentation**: See `CLAUDE.md` for project overview
- **API Docs**: Available at `/api/docs` (if implemented)
- **Status**: Check `/api/health` endpoint
- **Issues**: Review error logs and use debugging tools

---

## Next Steps

1. Choose your deployment platform
2. Follow the relevant setup section above
3. Run through the post-deployment verification checklist
4. Set up monitoring and logging
5. Create a maintenance schedule
6. Document your specific deployment configuration
7. Train team members on deployment procedures

Good luck with your production deployment!
