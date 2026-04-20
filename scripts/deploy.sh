#!/bin/bash
set -e

echo "=== Deploying to Production ==="

# SSH and deploy
ssh -i //wsl.localhost/Ubuntu/home/konra/.ssh/content-forge-key root@65.108.6.149 << 'ENDSSH'
cd /opt/thumbnail-generator

# Pull latest code
git pull origin main

# Install ALL dependencies (Prisma CLI needed for build)
npm ci

# Regenerate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build Next.js
npm run build

# Restart PM2
pm2 restart ecosystem.config.js --update-env

echo "✓ Deployment complete"
ENDSSH

echo "=== Deployment Successful ==="
