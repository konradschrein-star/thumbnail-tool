// Retry all failed jobs in the queue
import 'dotenv/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
});

const queue = new Queue('thumbnail-generation', { connection: redisConnection });

async function retryFailed() {
  try {
    const failed = await queue.getFailed();
    console.log(`Found ${failed.length} failed jobs`);

    for (const job of failed) {
      console.log(`Retrying job ${job.id}...`);
      await job.retry();
    }

    console.log(`\n✓ Retried ${failed.length} jobs`);

    await queue.close();
    await redisConnection.quit();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

retryFailed();
