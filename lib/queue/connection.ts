import Redis from 'ioredis';

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log('✓ Redis connected');
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});
