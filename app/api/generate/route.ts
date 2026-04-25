import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';
import * as CreditService from '@/lib/credit-service';
import { getUserLimiter } from '@/lib/rate-limiter';
import { thumbnailQueue } from '@/lib/queue/thumbnail-queue';
import { buildFullPrompt, validatePromptLength } from '@/lib/payload-engine';

export async function POST(request: NextRequest) {
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
  }

  const userId = authResult.user.id;

  // Rate limiting: 5 generations per minute per user
  const limiter = getUserLimiter(userId, 5, 'minute');
  const remainingTokens = await limiter.removeTokens(1);

  if (remainingTokens < 0) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 5 generations per minute.',
        retryAfter: 60
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60)
        }
      }
    );
  }

  const userEmail = authResult.user.email || 'test@titan.ai';
  const userRole = authResult.user.role || 'USER';
  const isSuperuser = authResult.user.isSuperuser || false;
  const isTestUser = authResult.user.isTestUser || false;

  try {
    const body = await request.json();
    const {
      channelId,
      archetypeId,
      videoTopic,
      thumbnailText,
      customPrompt,
      versionCount = 1,
      includeBrandColors = true,
      includePersona = true
    } = body;

    // Strict validation (thumbnailText is optional - empty means remove text)
    if (!channelId || !archetypeId || !videoTopic) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, archetypeId, videoTopic' },
        { status: 400 }
      );
    }

    if (videoTopic.length > 200 || thumbnailText.length > 100) {
      return NextResponse.json(
        { error: 'Input text too long. Max 200 for topic, 100 for thumbnail text.' },
        { status: 400 }
      );
    }

    // Validate customPrompt length to prevent DoS attacks
    if (customPrompt && customPrompt.length > 5000) {
      return NextResponse.json(
        { error: 'Custom prompt too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      );
    }

    const rawCount = parseInt(String(versionCount), 10);
    const count = Math.min(Math.max(isNaN(rawCount) ? 1 : rawCount, 1), 4);

    // Credit system: Non-admins must have sufficient credits
    let creditsRemaining: number | null = null;
    let shouldDeductCredits = userRole !== 'ADMIN';

    if (shouldDeductCredits) {
      try {
        const userCredits = await CreditService.getUserCredits(userId);
        if (userCredits < count) {
          return NextResponse.json(
            {
              error: 'Insufficient credits',
              creditsRequired: count,
              creditsAvailable: userCredits,
              message: 'You need more credits to generate thumbnails. Please contact an admin to purchase credits.'
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

    // Fetch channel and archetype
    let channel, archetype;
    try {
      channel = await prisma.channels.findUnique({ where: { id: channelId } });
      archetype = await prisma.archetypes.findUnique({ where: { id: archetypeId } });
    } catch (dbError) {
      console.error('DB lookup failed in generate:', dbError);
      return NextResponse.json(
        { error: 'Database error. Please try again or contact support if the issue persists.' },
        { status: 500 }
      );
    }

    // Validate that channel and archetype exist
    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found. Please select a valid channel.' },
        { status: 404 }
      );
    }

    if (!archetype) {
      return NextResponse.json(
        { error: 'Archetype not found. Please select a valid archetype.' },
        { status: 404 }
      );
    }

    // Validate ownership for non-admins
    if (userRole !== 'ADMIN') {
      // Check channel ownership
      if (channel.userId !== userId) {
        console.error(`[Security] Unauthorized channel access attempt - User: ${userId}, Channel: ${channelId} (${channel.name}), Owner: ${channel.userId}`);
        return NextResponse.json(
          { error: 'Forbidden: Access denied' },
          { status: 403 }
        );
      }

      // Check archetype ownership (allow test account archetypes)
      const testUser = await prisma.users.findUnique({
        where: { email: 'test@test.ai' },
        select: { id: true }
      });

      if (archetype.userId !== userId && archetype.userId !== testUser?.id) {
        console.error(`[Security] Unauthorized archetype access attempt - User: ${userId}, Archetype: ${archetypeId} (${archetype.name}), Owner: ${archetype.userId}`);
        return NextResponse.json(
          { error: 'Forbidden: Access denied' },
          { status: 403 }
        );
      }
    }

    // FINAL GUARD: Enforce Admin-Only archetypes
    if (archetype.isAdminOnly && (userRole !== 'ADMIN' || isTestUser)) {
      return NextResponse.json({ error: 'Unauthorized archetype usage. This style is restricted to administrators.' }, { status: 403 });
    }

    // Validate prompt length before queueing jobs
    const testPrompt = customPrompt || buildFullPrompt(
      channel,
      archetype,
      { videoTopic, thumbnailText, customPrompt },
      includeBrandColors,
      includePersona
    );

    const promptValidation = validatePromptLength(testPrompt, 2000);
    if (!promptValidation.valid) {
      return NextResponse.json(
        {
          error: 'Prompt is too long',
          details: promptValidation.error,
          suggestion: 'Try shortening the video topic, thumbnail text, or persona description.'
        },
        { status: 400 }
      );
    }

    // Deduct credits upfront for non-admins
    let creditsDeducted = 0;

    if (shouldDeductCredits) {
      try {
        creditsRemaining = await CreditService.deductCreditsForJob(
          userId,
          count,
          `Deducted ${count} credits for ${count} thumbnail generation(s): ${videoTopic}`,
          null
        );
        creditsDeducted = count;
      } catch (error) {
        console.error('Credit deduction failed:', error);

        if (error instanceof CreditService.InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: 'Insufficient credits',
              creditsRequired: count,
              creditsAvailable: error.available,
              message: 'You need more credits to generate thumbnails. Please contact an admin to purchase credits.'
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

    console.log(`\n🎨 Queueing ${count} thumbnail generation(s) for user ${userEmail}`);

    // Create jobs and queue them asynchronously
    const jobIds: string[] = [];
    const jobs: any[] = [];

    for (let i = 0; i < count; i++) {
      try {
        // Create generation job with 'pending' status
        const job = await prisma.generation_jobs.create({
          data: {
            channelId,
            archetypeId,
            userId,
            videoTopic,
            thumbnailText,
            customPrompt,
            isManual: true,
            status: 'pending',
            credits_deducted: shouldDeductCredits ? 1 : null,
          },
        } as any);

        // Queue the job for async processing
        await thumbnailQueue.add(
          'thumbnail-generation',
          {
            jobId: job.id,
            channelId,
            archetypeId,
            videoTopic,
            thumbnailText,
            customPrompt,
            includeBrandColors,
            includePersona,
          },
          {
            jobId: job.id,
          }
        );

        jobIds.push(job.id);
        jobs.push(job);
        console.log(`   ✓ Queued job ${i + 1}/${count}: ${job.id}`);
      } catch (error) {
        console.error(`Failed to create/queue job ${i + 1}:`, error);

        // If queueing fails, mark job as failed if it was created
        if (jobs[i]) {
          await prisma.generation_jobs.update({
            where: { id: jobs[i].id },
            data: {
              status: 'failed',
              errorMessage: 'Failed to queue job',
            },
          }).catch(err => console.error('Failed to update failed job:', err));
        }
      }
    }

    if (jobIds.length === 0) {
      return NextResponse.json(
        { error: 'Failed to queue any jobs' },
        { status: 500 }
      );
    }

    console.log(`✓ Successfully queued ${jobIds.length}/${count} jobs`);

    const response: any = {
      success: true,
      jobs: jobs,
      job: jobs[0],
      message: `Queued ${jobIds.length} thumbnail generation job(s). They will complete in the background.`,
      jobIds: jobIds,
    };

    // Include credit info for non-admins
    if (shouldDeductCredits) {
      response.creditsRemaining = creditsRemaining;
      response.creditsDeducted = creditsDeducted;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Generation Error (Top Level):', error);

    if (error instanceof CreditService.InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          creditsRequired: error.required,
          creditsAvailable: error.available,
          message: 'You need more credits to generate thumbnails. Please contact an admin to purchase credits.'
        },
        { status: 402 }
      );
    }

    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred during generation';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
