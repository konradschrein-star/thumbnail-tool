import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export interface ThumbnailJobData {
  jobId: string;
  batchJobId?: string;
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
  softwareSubject?: string;
  includeBrandColors?: boolean;
  includePersona?: boolean;
  resolution?: '512' | '1K' | '2K';
  stableMode?: boolean;
}

export const thumbnailQueue = new Queue<ThumbnailJobData>('thumbnail-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2, // 1 original attempt + 1 retry (changed from 3 to save credits)
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

thumbnailQueue.on('error', (err) => {
  console.error('Queue error:', err);
});

console.log('✓ Thumbnail queue initialized');
