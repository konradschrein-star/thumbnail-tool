import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as payloadEngine from '@/lib/payload-engine';
import * as generationService from '@/lib/generation-service';
import * as r2Service from '@/lib/r2-service';
import { checkManualRateLimit } from '@/lib/rate-limit';
import { getApiAuth } from '@/lib/api-auth';
import { EMERGENCY_CHANNELS, EMERGENCY_ARCHETYPES } from '@/lib/emergency-data';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
  }

  const userId = authResult.user.id;
  const userEmail = authResult.user.email || 'test@titan.ai';
  const userRole = authResult.user.role || 'USER';
  const isSuperuser = authResult.user.isSuperuser || false;
  const isTestUser = authResult.user.isTestUser || false;

  // Enforce manual generation limit (10/day for USER role, shared for Test User)
  const rateLimitResponse = await checkManualRateLimit(userId, userRole, isSuperuser);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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

    // Strict validation
    if (!channelId || !archetypeId || !videoTopic || !thumbnailText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (videoTopic.length > 200 || thumbnailText.length > 100) {
      return NextResponse.json(
        { error: 'Input text too long. Max 200 for topic, 100 for thumbnail text.' },
        { status: 400 }
      );
    }

    const rawCount = parseInt(String(versionCount), 10);
    const count = Math.min(Math.max(isNaN(rawCount) ? 1 : rawCount, 1), 4);
    const results = [];

    // Fetch channel and archetype
    let channel, archetype;
    try {
      channel = await prisma.channel.findUnique({ where: { id: channelId } });
      archetype = await prisma.archetype.findUnique({ where: { id: archetypeId } });
    } catch (dbError) {
      console.error('DB lookup failed in generate, using emergency fallback:', dbError);
    }

    // Fallback to emergency data if DB lookup failed or returned nothing
    if (!channel) channel = EMERGENCY_CHANNELS.find(c => c.id === channelId) || EMERGENCY_CHANNELS[0];

    if (!archetype) {
      const emergencyArchetype = EMERGENCY_ARCHETYPES.find(a => a.id === archetypeId);
      if (emergencyArchetype) {
        // Enforce Admin-Only archetypes at the generation layer too
        if (emergencyArchetype.isAdminOnly && userRole !== 'ADMIN') {
          return NextResponse.json({ error: 'Unauthorized archetype usage' }, { status: 403 });
        }
        archetype = emergencyArchetype as any;
      } else {
        archetype = EMERGENCY_ARCHETYPES[0] as any;
      }
    }

    // Build base payload using the engine's data-driven approach
    // If the user modified the draft in the UI, we just use that directly!
    const fullUserPrompt = customPrompt || payloadEngine.buildFullPrompt(channel as any, archetype as any, { videoTopic, thumbnailText }, includeBrandColors, includePersona);

    const payload: payloadEngine.AIRequestPayload = {
      systemPrompt: "You are an expert AI image generator fine-tuned for high-CTR YouTube thumbnails.",
      userPrompt: fullUserPrompt,
      base64Images: {
        archetype: await payloadEngine.encodeImageToBase64(archetype.imageUrl),
        persona: (includePersona && (channel as any).personaAssetPath)
          ? await payloadEngine.encodeImageToBase64((channel as any).personaAssetPath)
          : undefined,
      },
    };

    for (let i = 0; i < count; i++) {
      // Create initial job record
      let job;
      const mockId = `mock_${Date.now()}_${i}`;
      try {
        job = await prisma.generationJob.create({
          data: {
            channelId,
            archetypeId,
            userId,
            videoTopic,
            thumbnailText,
            customPrompt,
            isManual: true, // Manual UI route
            status: 'processing'
          },
        } as any);
      } catch (dbError) {
        console.error('DB job creation failed, using mock ID:', dbError);
        job = { id: mockId, status: 'processing' };
      }

      try {
        const { buffer: imageBuffer, fallbackUsed, fallbackMessage } = await generationService.callNanoBanana(payload, process.env.GOOGLE_API_KEY!);

        // Upload to R2 (Mandatory for Vercel)
        const filename = `gen_${job.id}.png`;
        const outputUrl = await r2Service.uploadToR2(imageBuffer, filename, 'image/png', userEmail);

        try {
          const updatedJob = await prisma.generationJob.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              outputUrl,
              promptUsed: `${payload.systemPrompt}\n\n${payload.userPrompt}${fallbackUsed ? `\n\n[FALLBACK TRIGGERED: ${fallbackMessage}]` : ''}`,
              completedAt: new Date()
            },
          } as any);
          results.push({ ...updatedJob, fallbackUsed, fallbackMessage });
        } catch (dbError) {
          console.error('DB job update (complete) failed:', dbError);
          results.push({ ...job, status: 'completed', outputUrl, fallbackUsed, fallbackMessage });
        }
      } catch (error: any) {
        console.error(`Version ${i} failed:`, error);
        try {
          await prisma.generationJob.update({
            where: { id: job.id },
            data: { status: 'failed', errorMessage: error.message },
          } as any);
        } catch (dbError) {
          console.error('DB job update (failed) failed:', dbError);
        }

        if (count === 1) throw error;
        results.push({ id: job.id, status: 'failed', errorMessage: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      jobs: results,
      job: results[0],
    });
  } catch (error: any) {
    console.error('Generation Error (Top Level):', error);

    // Ensure we do not leak full stack traces in the 500 response
    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred during generation';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
