#!/usr/bin/env node

/**
 * Standalone Worker Process
 * Processes thumbnail generation jobs from the BullMQ queue
 *
 * Usage: npm run worker
 * Or: node --loader ts-node/esm worker.ts
 */

// Load environment variables from .env file FIRST
import 'dotenv/config';

import { createWorker, shutdownWorker } from './lib/queue/worker';
import { appendFileSync } from 'fs';

// Direct file logging to bypass PM2 buffering
const logFile = '/opt/thumbnail-generator/logs/worker-debug.log';
function log(message: string) {
  const timestamp = new Date().toISOString();
  appendFileSync(logFile, `${timestamp} ${message}\n`);
  console.log(message); // Also log to console
}

async function main() {
  log('\n🚀 Starting thumbnail generation worker...');
  log(`   Time: ${new Date().toISOString()}`);

  // Debug: Show environment
  log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  log(`   REDIS_HOST: ${process.env.REDIS_HOST ? 'SET' : 'MISSING'}`);
  log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'MISSING'}`);
  log(`   GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING'}`);
  log(`   STORAGE_PATH: ${process.env.STORAGE_PATH ? 'SET' : 'MISSING'}`);

  // Validate environment variables
  const requiredEnvVars = ['REDIS_HOST', 'DATABASE_URL', 'GOOGLE_API_KEY', 'STORAGE_PATH'];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingEnvVars.length > 0) {
    log(`\n❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }

  try {
    // Create and start worker
    const worker = createWorker();

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️ Received ${signal}`);
      await shutdownWorker(worker);
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    log('✓ Worker is running and listening for jobs...\n');
  } catch (error) {
    log(`\n❌ Failed to start worker: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
