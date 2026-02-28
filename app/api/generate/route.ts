import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as payloadEngine from '@/lib/payload-engine';
import * as generationService from '@/lib/generation-service';
import * as r2Service from '@/lib/r2-service';
import { checkManualRateLimit } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import { EMERGENCY_CHANNELS, EMERGENCY_ARCHETYPES } from '@/lib/emergency-data';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const userRole = (session.user as any).role || 'USER';

  // Enforce manual generation limit (10/day for USER role)
  const rateLimitResponse = await checkManualRateLimit(userId, userRole);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { channelId, archetypeId, videoTopic, thumbnailText, customPrompt, versionCount = 1 } = body;

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

    const count = Math.min(Math.max(Number(versionCount) || 1, 1), 4);
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
    if (!archetype) archetype = EMERGENCY_ARCHETYPES.find(a => a.id === archetypeId) || EMERGENCY_ARCHETYPES[0];

    // Build base payload using the engine's data-driven approach
    const payload: payloadEngine.AIRequestPayload = {
      systemPrompt: customPrompt || `${channel.personaDescription} ${archetype.layoutInstructions}`,
      userPrompt: `Create a professional YouTube thumbnail.\n\nTopic: ${videoTopic}\nText to display: "${thumbnailText}"\n\nUse the reference image for style inspiration.`,
      base64Images: {
        archetype: await payloadEngine.encodeImageToBase64(archetype.imageUrl),
        persona: (channel as any).personaAssetPath
          ? await payloadEngine.encodeImageToBase64((channel as any).personaAssetPath)
          : { data: '', mimeType: 'image/jpeg' },
        logo: (channel as any).logoAssetPath
          ? await payloadEngine.encodeImageToBase64((channel as any).logoAssetPath)
          : { data: '', mimeType: 'image/png' },
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
        const imageBuffer = await generationService.callNanoBanana(payload, process.env.GOOGLE_API_KEY!);

        // Upload to R2 (Mandatory for Vercel)
        const filename = `gen_${job.id}.png`;
        const outputUrl = await r2Service.uploadToR2(imageBuffer, filename);

        try {
          const updatedJob = await prisma.generationJob.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              outputUrl,
              promptUsed: `${payload.systemPrompt}\n\n${payload.userPrompt}`,
              completedAt: new Date()
            },
          } as any);
          results.push(updatedJob);
        } catch (dbError) {
          console.error('DB job update (complete) failed:', dbError);
          results.push({ ...job, status: 'completed', outputUrl });
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
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
