import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as payloadEngine from '@/lib/payload-engine';
import * as generationService from '@/lib/generation-service';
import * as r2Service from '@/lib/r2-service';
import { checkManualRateLimit } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';

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
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    const archetype = await prisma.archetype.findUnique({ where: { id: archetypeId } });

    if (!channel || !archetype) {
      throw new Error('Channel or Archetype not found');
    }

    // Build base payload
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const payload: payloadEngine.AIRequestPayload = {
      systemPrompt: customPrompt || `${channel.personaDescription} ${archetype.layoutInstructions}`,
      userPrompt: `Create a professional YouTube thumbnail.\n\nTopic: ${videoTopic}\nText to display: "${thumbnailText}"\n\nUse the reference image for style inspiration.`,
      base64Images: {
        archetype: await payloadEngine.encodeImageToBase64(`${baseUrl}${archetype.imageUrl}`),
        persona: (channel as any).personaAssetPath ? await payloadEngine.encodeImageToBase64(`${baseUrl}${(channel as any).personaAssetPath}`) : '',
        logo: (channel as any).logoAssetPath ? await payloadEngine.encodeImageToBase64(`${baseUrl}${(channel as any).logoAssetPath}`) : '',
      },
    };

    for (let i = 0; i < count; i++) {
      // Create initial job record
      const job = await prisma.generationJob.create({
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

      try {
        const imageBuffer = await generationService.callNanoBanana(payload, process.env.GOOGLE_API_KEY!);

        // Upload to R2 (Mandatory for Vercel)
        const filename = `gen_${job.id}.png`;
        const outputUrl = await r2Service.uploadToR2(imageBuffer, filename);

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
      } catch (error: any) {
        console.error(`Version ${i} failed:`, error);
        await prisma.generationJob.update({
          where: { id: job.id },
          data: { status: 'failed', errorMessage: error.message },
        } as any);

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
