/**
 * Test Script: Generate 3 Thumbnails and Measure Timing
 *
 * This script creates 3 test generation jobs and measures their completion time
 * to verify the improved parallel generation and fallback system.
 */

import { prisma } from './lib/prisma';

async function testGenerationTiming() {
  console.log('🧪 Starting Generation Timing Test...\n');

  // Get first available channel
  const channel = await prisma.channels.findFirst();

  if (!channel) {
    throw new Error('No channel found. Please seed the database first.');
  }

  // Get an archetype for this channel
  const channelArchetype = await prisma.channel_archetypes.findFirst({
    where: { channelId: channel.id },
    include: {
      archetypes: true,
    },
  });

  if (!channelArchetype || !channelArchetype.archetypes) {
    throw new Error('No archetype found for this channel. Please seed the database first.');
  }

  const archetype = channelArchetype.archetypes;

  console.log(`Channel: ${channel.name}`);
  console.log(`Archetype: ${archetype.name}`);
  console.log(`User ID: ${channel.userId}\n`);

  const testTopics = [
    'How to Master TypeScript in 2026',
    'The Ultimate Guide to React Performance',
    'CSS Grid vs Flexbox: Which to Choose?',
  ];

  const jobIds: string[] = [];

  // Create 3 test jobs
  console.log('📝 Creating 3 test generation jobs...\n');

  for (let i = 0; i < testTopics.length; i++) {
    const job = await prisma.generation_jobs.create({
      data: {
        userId: channel.userId,
        channelId: channel.id,
        archetypeId: archetype.id,
        videoTopic: testTopics[i],
        thumbnailText: `TEST ${i + 1}`,
        status: 'pending',
        isManual: true,
      },
    });

    jobIds.push(job.id);
    console.log(`✓ Job ${i + 1} created: ${job.id}`);
  }

  console.log('\n⏳ Waiting for jobs to complete...\n');
  console.log('Monitor logs with:');
  console.log('ssh root@65.108.6.149 "pm2 logs thumbnail-worker --lines 50"\n');

  // Poll for completion
  const startTime = Date.now();
  const maxWaitTime = 5 * 60 * 1000; // 5 minutes max
  const pollInterval = 2000; // Check every 2 seconds

  const results: Array<{
    jobId: string;
    topic: string;
    status: string;
    duration: number | null;
    error: string | null;
  }> = [];

  while (Date.now() - startTime < maxWaitTime) {
    const jobs = await prisma.generation_jobs.findMany({
      where: {
        id: { in: jobIds },
      },
      select: {
        id: true,
        videoTopic: true,
        status: true,
        createdAt: true,
        completedAt: true,
        errorMessage: true,
      },
    });

    // Check if all jobs are done
    const allDone = jobs.every((job) => job.status === 'completed' || job.status === 'failed');

    if (allDone) {
      console.log('✅ All jobs completed!\n');

      // Calculate results
      for (const job of jobs) {
        const duration = job.completedAt
          ? Math.round((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000)
          : null;

        results.push({
          jobId: job.id,
          topic: job.videoTopic,
          status: job.status,
          duration,
          error: job.errorMessage,
        });
      }

      break;
    }

    // Show progress
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const failed = jobs.filter((j) => j.status === 'failed').length;
    const processing = jobs.filter((j) => j.status === 'processing').length;

    process.stdout.write(`\r⏳ Progress: ${completed} completed, ${processing} processing, ${failed} failed...`);

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📊 GENERATION TIMING TEST RESULTS');
  console.log('═'.repeat(80));
  console.log('');

  let totalTime = 0;
  let successCount = 0;

  results.forEach((result, index) => {
    console.log(`Test ${index + 1}: ${result.topic}`);
    console.log(`   Status: ${result.status === 'completed' ? '✅' : '❌'} ${result.status.toUpperCase()}`);

    if (result.duration !== null) {
      const minutes = Math.floor(result.duration / 60);
      const seconds = result.duration % 60;
      const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      console.log(`   Duration: ⏱️  ${timeStr} (${result.duration}s)`);

      if (result.status === 'completed') {
        totalTime += result.duration;
        successCount++;
      }
    } else {
      console.log(`   Duration: N/A (job did not complete)`);
    }

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    console.log('');
  });

  console.log('═'.repeat(80));
  console.log('Summary:');
  console.log(`   Successful: ${successCount}/3`);

  if (successCount > 0) {
    const avgTime = Math.round(totalTime / successCount);
    const minutes = Math.floor(avgTime / 60);
    const seconds = avgTime % 60;
    const avgTimeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    console.log(`   Average Time: ${avgTimeStr} (${avgTime}s)`);

    // Performance assessment
    if (avgTime < 30) {
      console.log(`   Performance: 🚀 EXCELLENT (under 30s)`);
    } else if (avgTime < 60) {
      console.log(`   Performance: ✅ GOOD (30-60s)`);
    } else {
      console.log(`   Performance: ⚠️  SLOW (over 60s)`);
    }
  }

  console.log('═'.repeat(80));
  console.log('');

  await prisma.$disconnect();
}

testGenerationTiming().catch(console.error);
