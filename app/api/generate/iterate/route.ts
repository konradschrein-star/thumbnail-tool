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
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.user.id;
  const userRole = authResult.user.role || 'USER';

  // Rate limiting: 5 iterations per minute
  const limiter = getUserLimiter(userId, 5, 'minute');
  const remainingTokens = await limiter.removeTokens(1);

  if (remainingTokens < 0) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 5 iterations per minute.',
        retryAfter: 60
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const {
      originalJobId,
      referenceImageUrl,
      changeRequest,
      channelId,
      archetypeId,
      videoTopic,
      thumbnailText,
    } = body;

    // Validate required fields
    if (!originalJobId || !referenceImageUrl || !changeRequest || !channelId || !archetypeId || !videoTopic || !thumbnailText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch channel and archetype
    const channel = await prisma.channels.findUnique({ where: { id: channelId } });
    const archetype = await prisma.archetypes.findUnique({ where: { id: archetypeId } });

    if (!channel || !archetype) {
      return NextResponse.json(
        { error: 'Channel or archetype not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (userRole !== 'ADMIN' && channel.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied' },
        { status: 403 }
      );
    }

    // Build iteration prompt
    const basePrompt = buildFullPrompt(
      channel,
      archetype,
      { videoTopic, thumbnailText },
      true,
      true
    );

    const iterationPrompt = `${basePrompt}

ITERATION REQUEST: ${changeRequest}

Use the reference image as the base and apply ONLY the requested changes. Keep everything else the same.`;

    // Validate prompt length
    const validation = validatePromptLength(iterationPrompt, 2000);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Iteration prompt too long',
          details: validation.error,
        },
        { status: 400 }
      );
    }

    // Check and deduct credits (non-admins only)
    if (userRole !== 'ADMIN') {
      const userCredits = await CreditService.getUserCredits(userId);
      if (userCredits < 1) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            creditsRequired: 1,
            creditsAvailable: userCredits,
          },
          { status: 402 }
        );
      }

      await CreditService.deductCreditsForJob(
        userId,
        1,
        `Iteration: ${changeRequest.substring(0, 50)}...`,
        originalJobId
      );
    }

    // Create job
    const job = await prisma.generation_jobs.create({
      data: {
        channelId,
        archetypeId,
        userId,
        videoTopic,
        thumbnailText,
        customPrompt: iterationPrompt,
        isManual: true,
        status: 'pending',
        credits_deducted: userRole !== 'ADMIN' ? 1 : null,
        metadata: {
          isIteration: true,
          originalJobId,
          changeRequest,
        },
      },
    });

    // Queue job with reference image
    await thumbnailQueue.add(
      'thumbnail-generation',
      {
        jobId: job.id,
        channelId,
        archetypeId,
        videoTopic,
        thumbnailText,
        customPrompt: iterationPrompt,
        includeBrandColors: true,
        includePersona: true,
      },
      { jobId: job.id }
    );

    console.log(`✓ Queued iteration job: ${job.id}`);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error('Iteration API error:', error);
    return NextResponse.json(
      { error: 'Failed to queue iteration job' },
      { status: 500 }
    );
  }
}
