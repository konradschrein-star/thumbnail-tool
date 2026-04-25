// Quick script to check BullMQ queue status
import 'dotenv/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
});

const queue = new Queue('thumbnail-generation', { connection: redisConnection });

async function checkQueue() {
  try {
    const counts = await queue.getJobCounts();
    console.log('Queue counts:', counts);

    const waiting = await queue.getWaiting();
    console.log(`\nWaiting jobs (${waiting.length}):`);
    waiting.forEach((job) => {
      console.log(`  - ${job.id}: ${job.data.videoTopic || 'N/A'}`);
    });

    const active = await queue.getActive();
    console.log(`\nActive jobs (${active.length}):`);
    active.forEach((job) => {
      console.log(`  - ${job.id}: ${job.data.videoTopic || 'N/A'}`);
    });

    const failed = await queue.getFailed();
    console.log(`\nFailed jobs (${failed.length}):`);
    failed.slice(0, 5).forEach((job) => {
      console.log(`  - ${job.id}: ${job.failedReason || 'N/A'}`);
    });

    await queue.close();
    await redisConnection.quit();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkQueue();
