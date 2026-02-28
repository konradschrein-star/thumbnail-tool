# 🚀 Vercel & Supabase Production Setup Guide

This guide covers how to deploy the **Thumbnail Creator V2** to Vercel, utilizing Supabase for your database and Cloudflare R2 for asset storage.

## 🏗️ Architecture Overview

- **Frontend/Backend**: Next.js (Hosted on Vercel)
- **Database**: PostgreSQL (Hosted on Supabase)
- **Asset Storage**: Cloudflare R2 (Global CDN for thumbnails and reference assets)
- **Authentication**: NextAuth.js v5

---

## 🛠️ Setup Steps

### 1. Supabase (Database)
1. **Create Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2. **Retrieve Credentials**: Under Project Settings > Database, copy the **Transaction Connection String**.
3. **Configure Prisma**: Add the connection string to your `.env` as `DATABASE_URL`.
4. **Push Schema**:
   ```bash
   npx prisma db push
   ```

### 2. Cloudflare R2 (Storage)
1. **Create Bucket**: Log in to Cloudflare > R2 and create a bucket (e.g., `thumbnail-assets`).
2. **API Tokens**: Go to R2 > Manage R2 API Tokens and create a token with **Edit** permissions.
3. **Public URL**: Enable a custom domain or a `pub-XXXX.r2.dev` URL for the bucket.
4. **Configure ENV**:
   ```env
   R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=thumbnail-assets
   R2_PUBLIC_URL=https://your-public-url.com
   ```

### 3. Vercel Deployment
1. **Import Project**: Connect your GitHub repository to Vercel.
2. **Environment Variables**: Add all variables from your `.env` to the Vercel project settings.
3. **Build Command**: Ensure it includes `prisma generate`.
   - Vercel Command: `npx prisma generate && next build`
4. **Deploy**: Hit deploy.

### 4. Cron Jobs
If you prefer to enable automatic history cleanup for regular users, add a cron job in your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 * * *"
    }
  ]
}
```
Ensure you have set a `CRON_SECRET` in your environment variables. The endpoint is protected and expects a `Bearer` token.

---

## 🔒 Security & Rate Limiting

### Database-Backed Rate Limiting
The application enforces a **10 manual generations per day per user** limit. 
- Tracked in the `GenerationJob` table via `userId` and `isManual` fields.
- Logic handled in `lib/rate-limit.ts`.

### Protected Resources
- All `/dashboard` and `/api` routes (Resource management, Uploads, Jobs) are protected by `auth()`.
- AI prompts are sanitized to prevent accidental token drain or injection.

---

## 📋 Environment Variables Template

```env
# Core
NODE_ENV=production
NEXTAUTH_SECRET=your_32_char_secret
NEXTAUTH_URL=https://your-app.vercel.app

# Google AI
GOOGLE_API_KEY=your_google_ai_key

# Supabase
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
SUPABASE_URL=https://[REF].supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Cloudflare R2
R2_ENDPOINT=https://[ID].r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_id
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

## 🧪 Verification
After deployment, verify:
1. **Sign In**: Can you sign in/register?
2. **Generation**: Does a manual generation upload to R2 and show up in the UI?
3. **Rate Limit**: Does the 11th generation attempt (manual) return a 429 error?
4. **Analytics**: Are jobs appearing in the Supabase dashboard with the correct `userId`?

---

**Last Updated**: 2026-02-25
**Version**: v2.0.0 (Stateless & Vercel-Ready)
