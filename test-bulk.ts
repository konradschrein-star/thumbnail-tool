/**
 * Bulk test script - generate 3 thumbnails
 */
import { prisma } from './lib/prisma';
import { thumbnailQueue } from './lib/queue/thumbnail-queue';

const TEST_TOPICS = [
  { topic: '10 Amazing AI Tools Everyone Should Know', text: 'TOP 10 AI TOOLS' },
  { topic: 'How to Master Prompt Engineering in 2026', text: 'PROMPT MASTERY' },
  { topic: 'ChatGPT vs Claude vs Gemini: Which is Best?', text: 'AI SHOWDOWN' },
];

async function main() {
  console.log('Creating bulk thumbnail generation jobs...\n');

  const channelId = 'cmo78zz9m0003gvb0jhaj82at';
  const archetypeId = 'cmo78zz9p0005gvb0qg95wm4f';

  for (let i = 0; i < TEST_TOPICS.length; i++) {
    const { topic, text } = TEST_TOPICS[i];

    // Create generation job
    const job = await prisma.generationJob.create({
      data: {
        channelId,
        archetypeId,
        videoTopic: topic,
        thumbnailText: text,
        status: 'queued',
      },
    });

    console.log(`✓ Job ${i + 1}/3 created: ${job.id}`);
    console.log(`  Topic: ${topic}`);

    // Add to queue
    await thumbnailQueue.add('thumbnail-generation', {
      jobId: job.id,
      channelId,
      archetypeId,
      videoTopic: topic,
      thumbnailText: text,
    });

    console.log(`  Queued for processing\n`);
  }

  console.log(`✓ All 3 jobs queued successfully`);
  console.log(`\nWatch worker.log to see progress:\n  tail -f worker.log\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
