/**
 * BullMQ Worker for Thumbnail Generation
 * Processes jobs from the thumbnail queue using unified generator and local storage
 *
 * Features:
 * - Unified image generation with AI33 → Google fallback
 * - Local file storage instead of R2
 * - Batch progress tracking
 * - ZIP generation for completed batches
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { ThumbnailJobData, thumbnailQueue } from './thumbnail-queue';
import { prisma } from '../prisma';
import { createLocalStorage } from '../storage/local';
import { createUnifiedGeneratorFromEnv } from '../ai/image-generator';
import { encodeImageToBase64, sanitizePrompt } from '../payload-engine';
import { promisify } from 'util';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { createReadStream, createWriteStream } from 'fs';

const execAsync = promisify(exec);

/**
 * Initialize local storage and generator
 */
function initializeServices() {
  const storagePath = process.env.STORAGE_PATH;
  if (!storagePath) {
    throw new Error('STORAGE_PATH environment variable is required');
  }

  const localStorage = createLocalStorage();
  const generator = createUnifiedGeneratorFromEnv();

  return { localStorage, generator };
}

/**
 * Process a single thumbnail generation job
 */
async function processThumbnailJob(job: Job<ThumbnailJobData, void, 'thumbnail-generation'>) {
  const { jobId, batchJobId, channelId, archetypeId, videoTopic, thumbnailText, customPrompt } = job.data;

  console.log(`\n📸 Processing thumbnail job: ${jobId}`);
  console.log(`   Channel: ${channelId}, Archetype: ${archetypeId}`);

  try {
    const { localStorage, generator } = initializeServices();

    // Fetch channel and archetype from database
    const channel = await prisma.channels.findUnique({
      where: { id: channelId },
    });

    const archetype = await prisma.archetypes.findUnique({
      where: { id: archetypeId },
    });

    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    if (!archetype) {
      throw new Error(`Archetype not found: ${archetypeId}`);
    }

    // Mark job as processing
    await prisma.generation_jobs.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    // Build prompt using simplified prompt builder
    const { buildFullPrompt, validatePromptLength } = require('../payload-engine');
    const fullPrompt = customPrompt || buildFullPrompt(
      channel,
      archetype,
      { videoTopic, thumbnailText, customPrompt },
      true, // includeBrandColors
      true  // includePersona
    );

    // Validate prompt length before attempting generation
    const validation = validatePromptLength(fullPrompt, 2000);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log(`   → Generating image... (prompt: ${validation.length} chars)`);

    // Generate image with archetype reference URL - WRAP IN TRY-CATCH
    let generationResult;
    try {
      generationResult = await generator.generateImage({
        prompt: fullPrompt,
        referenceImageUrl: archetype.imageUrl,
      });
    } catch (genError) {
      // Extract meaningful error message from API response
      const errorMessage = genError instanceof Error ? genError.message : String(genError);
      console.error(`   ✗ Image generation failed: ${errorMessage}`);

      // Check for specific error patterns
      if (errorMessage.includes('prompt') && errorMessage.includes('long')) {
        throw new Error(`Prompt too long (${validation.length} characters). Please shorten your video topic, thumbnail text, or persona description.`);
      } else if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
        throw new Error('Generation blocked by safety filters. Please try different content or phrasing.');
      } else if (errorMessage.includes('INVALID_ARGUMENT')) {
        throw new Error(`Invalid request: ${errorMessage}`);
      } else {
        throw new Error(`Image generation failed: ${errorMessage}`);
      }
    }

    // Save thumbnail to local storage
    const filename = `${jobId}.png`;
    const outputUrl = await localStorage.saveThumbnail(generationResult.buffer, filename);

    // Update job with success
    const completedJob = await prisma.generation_jobs.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        outputUrl,
        promptUsed: fullPrompt,
        completedAt: new Date(),
        metadata: {
          cost: generationResult.cost,
          resolution: '1024x1024',
        },
      },
    });

    console.log(`✓ Thumbnail saved: ${outputUrl}`);

    // Update batch progress if this is part of a batch
    if (batchJobId) {
      await updateBatchProgress(batchJobId);
    }

    return completedJob;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`✗ Job failed: ${errorMessage}`);

    // Update job with failure
    await prisma.generation_jobs.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });

    // Update batch as partially failed if applicable
    if (batchJobId) {
      await updateBatchProgress(batchJobId, true);
    }

    throw error;
  }
}

/**
 * Update batch job progress and potentially generate ZIP when complete
 */
async function updateBatchProgress(batchJobId: string, hasFailed = false) {
  try {
    const batchJob = await prisma.batch_jobs.findUnique({
      where: { id: batchJobId },
      include: { generation_jobs: true },
    });

    if (!batchJob) {
      console.warn(`Batch job not found: ${batchJobId}`);
      return;
    }

    const completedJobs = batchJob.generation_jobs.filter((j) => j.status === 'completed').length;
    const failedJobs = batchJob.generation_jobs.filter((j) => j.status === 'failed').length;
    const totalJobs = batchJob.totalJobs;

    // Calculate batch status
    let batchStatus = 'PROCESSING';
    if (completedJobs + failedJobs === totalJobs) {
      batchStatus = failedJobs === 0 ? 'COMPLETED' : 'PARTIAL';
    }

    await prisma.batch_jobs.update({
      where: { id: batchJobId },
      data: {
        completedJobs,
        failedJobs,
        status: batchStatus as any,
      },
    });

    console.log(`   📊 Batch ${batchJobId} progress: ${completedJobs}/${totalJobs} completed`);

    // Generate ZIP if batch is complete
    if (batchStatus !== 'PROCESSING') {
      await generateBatchZip(batchJobId);
    }
  } catch (error) {
    console.error(`Failed to update batch progress: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate ZIP file for completed batch from local storage
 */
async function generateBatchZip(batchJobId: string) {
  try {
    console.log(`\n📦 Generating ZIP for batch: ${batchJobId}`);

    const batchJob = await prisma.batch_jobs.findUnique({
      where: { id: batchJobId },
      include: { generation_jobs: true },
    });

    if (!batchJob) {
      throw new Error(`Batch job not found: ${batchJobId}`);
    }

    const { localStorage } = initializeServices();
    const storageStats = await localStorage.getStorageStats();
    const storageBasePath = process.env.STORAGE_PATH;

    if (!storageBasePath) {
      throw new Error('STORAGE_PATH not configured');
    }

    // Create temp directory for ZIP assembly
    const tempDir = resolve(storageBasePath, 'temp', batchJobId);
    await fs.mkdir(tempDir, { recursive: true });

    // Copy completed thumbnails to temp directory
    const thumbnailPath = resolve(storageBasePath, 'thumbnails');
    for (const job of batchJob.generation_jobs) {
      if (job.status === 'completed' && job.outputUrl) {
        const filename = job.outputUrl.split('/').pop();
        if (filename) {
          const srcPath = resolve(thumbnailPath, filename);
          const destPath = resolve(tempDir, filename);

          try {
            const fileExists = await localStorage.thumbnailExists(filename);
            if (fileExists) {
              const srcBuffer = await fs.readFile(srcPath);
              await fs.writeFile(destPath, srcBuffer);
            }
          } catch (error) {
            console.warn(`Failed to copy ${filename} to temp: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }

    // Create ZIP file
    const zipPath = resolve(storageBasePath, 'zips', `${batchJobId}.zip`);
    await fs.mkdir(dirname(zipPath), { recursive: true });

    // Use system zip command if available, otherwise use Node archiver
    try {
      const { stdout } = await execAsync(`cd "${tempDir}" && zip -r "${zipPath}" . -q`);
      console.log(`✓ ZIP created: ${zipPath}`);
    } catch {
      // Fallback: use archiver library (requires npm install archiver)
      console.log('   → Using archiver for ZIP creation');
      try {
        const archiver = require('archiver');
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 6 } });

        await new Promise((resolve, reject) => {
          output.on('close', resolve);
          archive.on('error', reject);
          archive.pipe(output);
          archive.directory(tempDir, false);
          archive.finalize();
        });

        console.log(`✓ ZIP created: ${zipPath}`);
      } catch (error) {
        console.error(`ZIP creation failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    // Update batch with ZIP URL
    const zipUrl = `/storage/zips/${batchJobId}.zip`;
    await prisma.batch_jobs.update({
      where: { id: batchJobId },
      data: { outputZipUrl: zipUrl },
    });

    console.log(`✓ Batch ZIP available at: ${zipUrl}`);

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
      console.log('   ✓ Temp directory cleaned up');
    } catch {
      // Ignore cleanup errors
    }
  } catch (error) {
    console.error(`Failed to generate batch ZIP: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create and configure the worker
 */
export function createWorker() {
  const worker = new Worker<ThumbnailJobData, void, 'thumbnail-generation'>(
    'thumbnail-generation',
    async (job: Job<ThumbnailJobData, void, 'thumbnail-generation'>) => {
      await processThumbnailJob(job);
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
    }
  );

  // Event handlers
  worker.on('ready', () => {
    console.log('✓ Worker is ready and listening for jobs');
  });

  worker.on('active', (job: Job<ThumbnailJobData>) => {
    console.log(`▶ Job started: ${job.id}`);
  });

  worker.on('completed', (job: Job<ThumbnailJobData>) => {
    console.log(`✓ Job completed: ${job.id}`);
  });

  worker.on('failed', (job: Job<ThumbnailJobData> | undefined, err: Error) => {
    console.error(`✗ Job failed: ${job?.id} - ${err.message}`);
  });

  worker.on('error', (err: Error) => {
    console.error('Worker error:', err);
  });

  worker.on('stalled', (jobId: string) => {
    console.warn(`⚠ Job stalled: ${jobId}`);
  });

  console.log('✓ Thumbnail worker initialized');
  return worker;
}

/**
 * Graceful shutdown helper
 */
export async function shutdownWorker(worker: Worker<ThumbnailJobData, void, 'thumbnail-generation'>) {
  console.log('\n🛑 Shutting down worker...');
  try {
    await worker.close();
    console.log('✓ Worker closed gracefully');
  } catch (error) {
    console.error(`Error closing worker: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
