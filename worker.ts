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
  console.log('\n🚀 Starting thumbnail generation worker...');
  console.log(`   Time: ${new Date().toISOString()}`);

  // Validate environment variables
  const requiredEnvVars = ['REDIS_HOST', 'DATABASE_URL', 'GOOGLE_API_KEY', 'STORAGE_PATH'];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingEnvVars.length > 0) {
    console.error(`\n❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
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
