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

  // Fetch user preferences for resolution and stable mode
  let preferredResolution: '512' | '1K' | '2K' = '1K';
  let stableMode = true; // Default to stable mode
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });
    const preferences = (user?.preferences as any) || {};
    preferredResolution = preferences.preferredResolution || '1K';
    stableMode = preferences.stableMode !== undefined ? preferences.stableMode : true;
  } catch (error) {
    console.error('Failed to fetch user preferences:', error);
    // Continue with defaults
  }

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
    const validation = validatePromptLength(iterationPrompt, 3800);
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
    // Credit calculation:
    // - Base: 512=1, 1K=2, 2K=3
    // - First ref is FREE, additional refs: +1 each (only in normal mode)
    // - Stable mode: +1 credit (flat)
    // For iterations, assume max refs (2 additional)
    const resolutionBaseCredits = preferredResolution === '512' ? 1 : preferredResolution === '1K' ? 2 : 3;
    const maxAdditionalRefs = 2;

    let creditsRequired = resolutionBaseCredits;
    if (!stableMode) {
      creditsRequired += maxAdditionalRefs;
    }
    if (stableMode) {
      creditsRequired += 1;
    }

    if (userRole !== 'ADMIN') {
      const userCredits = await CreditService.getUserCredits(userId);
      if (userCredits < creditsRequired) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            creditsRequired,
            creditsAvailable: userCredits,
            message: `You need ${creditsRequired} credit${creditsRequired > 1 ? 's' : ''} for iteration at ${preferredResolution} resolution.`,
          },
          { status: 402 }
        );
      }

      await CreditService.deductCreditsForJob(
        userId,
        creditsRequired,
        `Iteration at ${preferredResolution}: ${changeRequest.substring(0, 50)}...`,
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
        credits_deducted: userRole !== 'ADMIN' ? creditsRequired : null,
        metadata: {
          isIteration: true,
          originalJobId,
          changeRequest,
          resolution: preferredResolution,
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
        resolution: preferredResolution,
        stableMode,
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
