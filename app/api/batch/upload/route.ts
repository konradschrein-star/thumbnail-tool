/**
 * Manual Batch Upload Endpoint
 * Accepts CSV or JSON file upload and creates batch job with queued thumbnails
 *
 * POST /api/batch/upload
 * Content-Type: multipart/form-data
 * Body: file (CSV/JSON), batchName (string)
 * Returns: { success: true, batchJobId: string, jobCount: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { thumbnailQueue } from '@/lib/queue/thumbnail-queue';
import { auth } from '@/lib/auth';
import Papa from 'papaparse';
import * as CreditService from '@/lib/credit-service';
import { getUserLimiter } from '@/lib/rate-limiter';

export interface UploadRow {
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_ROWS = 500;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in first' },
        { status: 401 }
      );
    }

    const userId = session.user.id as string;
    const userRole = (session.user as any).role || 'USER';

    // Rate limiting: 10 batch uploads per hour per user
    const limiter = getUserLimiter(userId, 10, 'hour');
    const remainingTokens = await limiter.removeTokens(1);

    if (remainingTokens < 0) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 10 batch uploads per hour.',
          retryAfter: 3600
        },
        {
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600)
          }
        }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const batchName = formData.get('batchName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!batchName || batchName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Batch name is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds 1MB limit (got ${Math.round(file.size / 1024)}KB)` },
        { status: 413 }
      );
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isJSON = fileName.endsWith('.json');

    if (!isCSV && !isJSON) {
      return NextResponse.json(
        { error: 'Only CSV and JSON files are supported' },
        { status: 400 }
      );
    }

    // Read file contents
    const fileText = await file.text();

    if (!fileText || fileText.trim().length === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Parse file based on type
    let rows: UploadRow[];

    try {
      if (isCSV) {
        const parsed = Papa.parse<UploadRow>(fileText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        if (parsed.errors.length > 0) {
          const firstError = parsed.errors[0];
          const lineNum = firstError.row !== undefined ? firstError.row + 1 : 'unknown';
          return NextResponse.json(
            { error: `Invalid CSV format at line ${lineNum}: ${firstError.message}` },
            { status: 400 }
          );
        }

        rows = parsed.data;
      } else {
        // Parse JSON
        const jsonData = JSON.parse(fileText);

        if (!Array.isArray(jsonData)) {
          return NextResponse.json(
            { error: 'JSON must be an array of objects' },
            { status: 400 }
          );
        }

        rows = jsonData;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { error: `Failed to parse file: ${errorMsg}` },
        { status: 400 }
      );
    }

    // Validate row count
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'File contains no valid rows' },
        { status: 400 }
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ROWS} rows allowed (got ${rows.length})` },
        { status: 400 }
      );
    }

    console.log(`\n📦 Processing upload: ${rows.length} rows as batch: ${batchName}`);

    // Credit system: Non-admins must have sufficient credits
    const isAdmin = userRole === 'ADMIN';
    let creditsRemaining: number | null = null;

    if (!isAdmin) {
      try {
        const userCredits = await CreditService.getUserCredits(userId);
        if (userCredits < rows.length) {
          return NextResponse.json(
            {
              error: 'Insufficient credits',
              creditsRequired: rows.length,
              creditsAvailable: userCredits,
              message: `You need ${rows.length} credits to create this batch. You have ${userCredits}.`
            },
            { status: 402 }
          );
        }
      } catch (error) {
        console.error('Credit check failed:', error);
        return NextResponse.json(
          { error: 'Failed to check credit balance' },
          { status: 500 }
        );
      }
    }

    // Validate all rows have required fields
    const invalidRows: number[] = [];
    const missingFields: { [key: number]: string[] } = {};

    rows.forEach((row, index) => {
      const missing: string[] = [];
      if (!row.channelId) missing.push('channelId');
      if (!row.archetypeId) missing.push('archetypeId');
      if (!row.videoTopic) missing.push('videoTopic');
      // thumbnailText is optional - empty text means "remove text from reference"
      // Don't validate thumbnailText as required

      if (missing.length > 0) {
        invalidRows.push(index + 1);
        missingFields[index + 1] = missing;
      }
    });

    if (invalidRows.length > 0) {
      const details = invalidRows
        .map((idx) => `Row ${idx}: missing ${missingFields[idx].join(', ')}`)
        .join('; ');

      return NextResponse.json(
        {
          error: `Invalid rows: ${invalidRows.length} row(s) missing required fields`,
          details,
        },
        { status: 400 }
      );
    }

    // Verify channels and archetypes exist
    const channelIds = [...new Set(rows.map((r) => r.channelId))];
    const archetypeIds = [...new Set(rows.map((r) => r.archetypeId))];

    const channels = await prisma.channels.findMany({
      where: { id: { in: channelIds } },
    });

    const archetypes = await prisma.archetypes.findMany({
      where: { id: { in: archetypeIds } },
    });

    const validChannelIds = new Set(channels.map((c) => c.id));
    const validArchetypeIds = new Set(archetypes.map((a) => a.id));

    const invalidChannelRows: number[] = [];
    const invalidArchetypeRows: number[] = [];

    rows.forEach((row, index) => {
      if (!validChannelIds.has(row.channelId)) {
        invalidChannelRows.push(index + 1);
      }
      if (!validArchetypeIds.has(row.archetypeId)) {
        invalidArchetypeRows.push(index + 1);
      }
    });

    if (invalidChannelRows.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid channel IDs found in rows: ${invalidChannelRows.join(', ')}`,
        },
        { status: 404 }
      );
    }

    if (invalidArchetypeRows.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid archetype IDs found in rows: ${invalidArchetypeRows.join(', ')}`,
        },
        { status: 404 }
      );
    }

    // Create batch job and deduct credits atomically (for non-admins)
    let batchJob;

    if (isAdmin) {
      // Admin: Create batch without deducting credits
      batchJob = await prisma.batch_jobs.create({
        data: {
          name: batchName,
          userId,
          status: 'PENDING',
          totalJobs: rows.length,
          credits_deducted: null, // Admins don't consume credits
        },
      });
      console.log(`✓ Created batch job (admin bypass): ${batchJob.id}`);
    } else {
      // Non-admin: Deduct credits atomically with batch creation
      try {
        const result = await CreditService.deductCreditsForBatch(
          userId,
          rows.length,
          batchName,
          `Deducted ${rows.length} credits for batch: ${batchName}`
        );
        batchJob = result.batchJob;
        creditsRemaining = result.creditsRemaining;
        console.log(`✓ Created batch job: ${batchJob.id} (${creditsRemaining} credits remaining)`);
      } catch (error) {
        console.error('Credit deduction failed:', error);

        if (error instanceof CreditService.InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: 'Insufficient credits',
              creditsRequired: error.required,
              creditsAvailable: error.available,
              message: `You need ${error.required} credits to create this batch. You have ${error.available}.`
            },
            { status: 402 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        );
      }
    }

    // Create generation jobs and queue them
    const jobIds: string[] = [];

    for (const row of rows) {
      // Create generation job
      const generationJob = await prisma.generation_jobs.create({
        data: {
          channelId: row.channelId,
          archetypeId: row.archetypeId,
          videoTopic: row.videoTopic,
          thumbnailText: row.thumbnailText,
          customPrompt: row.customPrompt || null,
          userId,
          status: 'pending',
          isManual: false, // Mark as from batch upload
          batchJobId: batchJob.id,
        },
      });

      // Add to queue
      try {
        await thumbnailQueue.add(
          'thumbnail-generation',
          {
            jobId: generationJob.id,
            batchJobId: batchJob.id,
            channelId: row.channelId,
            archetypeId: row.archetypeId,
            videoTopic: row.videoTopic,
            thumbnailText: row.thumbnailText,
            customPrompt: row.customPrompt,
            includeBrandColors: true, // Default to true for batch jobs
            includePersona: true, // Default to true for batch jobs
          },
          {
            jobId: generationJob.id,
          }
        );

        jobIds.push(generationJob.id);
        console.log(`   ✓ Queued job: ${generationJob.id}`);
      } catch (queueError) {
        console.error(`Failed to queue job ${generationJob.id}: ${queueError instanceof Error ? queueError.message : String(queueError)}`);

        // Mark job as failed
        await prisma.generation_jobs.update({
          where: { id: generationJob.id },
          data: {
            status: 'failed',
            errorMessage: 'Failed to queue job',
          },
        });
      }
    }

    console.log(`✓ Upload batch complete: ${jobIds.length}/${rows.length} jobs queued`);

    // Update batch status if all queued
    if (jobIds.length > 0) {
      await prisma.batch_jobs.update({
        where: { id: batchJob.id },
        data: { status: 'PROCESSING' },
      });
    }

    const response: any = {
      success: true,
      batchJobId: batchJob.id,
      jobCount: jobIds.length,
      message: `Queued ${jobIds.length} thumbnail generation jobs`,
    };

    // Include credit info for non-admins
    if (!isAdmin && creditsRemaining !== null) {
      response.creditsRemaining = creditsRemaining;
      response.creditsDeducted = rows.length;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Failed to process upload: ${errorMsg}` },
      { status: 500 }
    );
  }
}
