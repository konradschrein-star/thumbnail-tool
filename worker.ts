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

async function main() {
  // Force immediate output
  process.stdout.write('\n🚀 Starting thumbnail generation worker...\n');
  process.stdout.write(`   Time: ${new Date().toISOString()}\n`);

  // Debug: Show environment
  process.stdout.write(`   NODE_ENV: ${process.env.NODE_ENV}\n`);
  process.stdout.write(`   REDIS_HOST: ${process.env.REDIS_HOST ? 'SET' : 'MISSING'}\n`);
  process.stdout.write(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'MISSING'}\n`);
  process.stdout.write(`   GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING'}\n`);
  process.stdout.write(`   STORAGE_PATH: ${process.env.STORAGE_PATH ? 'SET' : 'MISSING'}\n`);

  // Validate environment variables
  const requiredEnvVars = ['REDIS_HOST', 'DATABASE_URL', 'GOOGLE_API_KEY', 'STORAGE_PATH'];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingEnvVars.length > 0) {
    process.stderr.write(`\n❌ Missing environment variables: ${missingEnvVars.join(', ')}\n`);
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

    console.log('✓ Worker is running and listening for jobs...\n');
  } catch (error) {
    console.error(`\n❌ Failed to start worker: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
