/**
 * Direct test script to generate a thumbnail bypassing API auth
 */
import { prisma } from './lib/prisma';
import { thumbnailQueue } from './lib/queue/thumbnail-queue';

async function main() {
  console.log('Creating test thumbnail generation job...\n');

  const channelId = 'cmo78zz9m0003gvb0jhaj82at';
  const archetypeId = 'cmo78zz9p0005gvb0qg95wm4f';
  const videoTopic = '10 Amazing AI Tools Everyone Should Know';
  const thumbnailText = 'TOP 10 AI TOOLS';

  // Create generation job
  const job = await prisma.generation_jobs.create({
    data: {
      channelId,
      archetypeId,
      videoTopic,
      thumbnailText,
      status: 'queued',
    },
  });

  console.log(`✓ Created job: ${job.id}`);

  // Add to queue
  await thumbnailQueue.add('thumbnail-generation', {
    jobId: job.id,
    channelId,
    archetypeId,
    videoTopic,
    thumbnailText,
  });

  console.log(`✓ Job queued for processing`);
  console.log(`\nWatch worker.log to see progress:\n  tail -f worker.log\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
