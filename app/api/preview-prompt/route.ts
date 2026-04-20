import { NextRequest, NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import * as payloadEngine from '@/lib/payload-engine';
import { EMERGENCY_CHANNELS, EMERGENCY_ARCHETYPES } from '@/lib/emergency-data';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getApiAuth(req);
    if (authResult.error || !authResult.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { channelId, archetypeId, videoTopic, thumbnailText, includeBrandColors = true, includePersona = true } = body;

    if (!channelId || !archetypeId || !videoTopic) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let channel = await prisma.channels.findUnique({
      where: { id: channelId }
    });
    if (!channel) {
      channel = EMERGENCY_CHANNELS.find(c => c.id === channelId) as any || EMERGENCY_CHANNELS[0];
    }

    let archetype = await prisma.archetype.findUnique({
      where: { id: archetypeId }
    });
    if (!archetype) {
      archetype = EMERGENCY_ARCHETYPES.find(a => a.id === archetypeId) as any || EMERGENCY_ARCHETYPES[0];
    }

    const jobConfig = { videoTopic, thumbnailText };
    const prompt = payloadEngine.buildFullPrompt(channel, archetype, jobConfig, includeBrandColors, includePersona);

    return NextResponse.json({ prompt });

  } catch (error: any) {
    console.error('[Preview API Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
