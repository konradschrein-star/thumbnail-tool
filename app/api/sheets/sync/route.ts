/**
 * Google Sheets Sync Endpoint
 * Creates batch job and queues thumbnail generation jobs from sheet data
 *
 * POST /api/sheets/sync
 * Body: { rows: ThumbnailRow[], batchName: string }
 * Returns: { success: true, batchJobId: string, jobCount: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { thumbnailQueue } from '@/lib/queue/thumbnail-queue';
import { auth } from '@/lib/auth';

export interface ThumbnailRow {
  rowIndex: number;
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
}

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

    // Parse request body
    const body = await request.json();
    const { rows, batchName } = body as {
      rows: ThumbnailRow[];
      batchName: string;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No rows provided for sync' },
        { status: 400 }
      );
    }

    if (!batchName || batchName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Batch name is required' },
        { status: 400 }
      );
    }

    console.log(`\n📦 Syncing ${rows.length} rows as batch: ${batchName}`);

    // Validate all rows have required fields
    const invalidRows = rows.filter(
      (row) =>
        !row.channelId ||
        !row.archetypeId ||
        !row.videoTopic ||
        !row.thumbnailText
    );

    if (invalidRows.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid rows: ${invalidRows.length} row(s) missing required fields`,
          invalidRows: invalidRows.map((r) => r.rowIndex),
        },
        { status: 400 }
      );
    }

    // Verify channels and archetypes exist
    const channelIds = [...new Set(rows.map((r) => r.channelId))];
    const archetypeIds = [...new Set(rows.map((r) => r.archetypeId))];

    const channels = await prisma.channel.findMany({
      where: { id: { in: channelIds } },
    });

    const archetypes = await prisma.archetype.findMany({
      where: { id: { in: archetypeIds } },
    });

    const validChannelIds = new Set(channels.map((c) => c.id));
    const validArchetypeIds = new Set(archetypes.map((a) => a.id));

    const invalidChannels = rows.filter((r) => !validChannelIds.has(r.channelId));
    const invalidArchetypes = rows.filter((r) => !validArchetypeIds.has(r.archetypeId));

    if (invalidChannels.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid channels: rows ${invalidChannels.map((r) => r.rowIndex).join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (invalidArchetypes.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid archetypes: rows ${invalidArchetypes.map((r) => r.rowIndex).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Create batch job
    const batchJob = await prisma.batchJob.create({
      data: {
        name: batchName,
        userId,
        status: 'PENDING',
        totalJobs: rows.length,
      },
    });

    console.log(`✓ Created batch job: ${batchJob.id}`);

    // Create generation jobs and queue them
    const jobIds: string[] = [];

    for (const row of rows) {
      // Create generation job
      const generationJob = await prisma.generationJob.create({
        data: {
          channelId: row.channelId,
          archetypeId: row.archetypeId,
          videoTopic: row.videoTopic,
          thumbnailText: row.thumbnailText,
          customPrompt: row.customPrompt,
          userId,
          status: 'pending',
          isManual: false, // Mark as from sheet sync
          batchJobId: batchJob.id,
        },
      });

      // Add to queue
      try {
        const queueJob = await thumbnailQueue.add(
          'thumbnail-generation',
          {
            jobId: generationJob.id,
            batchJobId: batchJob.id,
            channelId: row.channelId,
            archetypeId: row.archetypeId,
            videoTopic: row.videoTopic,
            thumbnailText: row.thumbnailText,
            customPrompt: row.customPrompt,
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
        await prisma.generationJob.update({
          where: { id: generationJob.id },
          data: {
            status: 'failed',
            errorMessage: 'Failed to queue job',
          },
        });
      }
    }

    console.log(`✓ Batch sync complete: ${jobIds.length}/${rows.length} jobs queued`);

    // Update batch status if all queued
    if (jobIds.length > 0) {
      await prisma.batchJob.update({
        where: { id: batchJob.id },
        data: { status: 'PROCESSING' },
      });
    }

    return NextResponse.json({
      success: true,
      batchJobId: batchJob.id,
      jobCount: jobIds.length,
      message: `Queued ${jobIds.length} thumbnail generation jobs`,
    });
  } catch (error) {
    console.error('Sheet sync error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Failed to sync sheet: ${errorMsg}` },
      { status: 500 }
    );
  }
}
