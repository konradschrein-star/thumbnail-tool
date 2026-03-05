#!/usr/bin/env node

// Batch thumbnail generation test
import 'dotenv/config';
import path from 'path';
import * as payloadEngine from '../lib/payload-engine';
import * as generationService from '../lib/generation-service';

// CRITICAL: Consistent persona description for ALL thumbnails
const CONSISTENT_PERSONA = `The host is a 28-year-old charismatic male with medium-length, slightly wavy brown hair styled casually with natural volume. He has warm hazel eyes, a strong defined jawline, and a friendly smile showing genuine enthusiasm. His face is oval-shaped with high cheekbones and a straight nose. He has a fit athletic build, stands confidently, and wears a simple black crew-neck t-shirt. His skin tone is lightly tanned (Mediterranean complexion). He has subtle stubble (5 o'clock shadow) giving him a mature, approachable look. His eyebrows are well-defined and expressive. This exact person appears in sharp focus with professional studio lighting, looking directly at the camera with an engaging, confident expression.`;

interface ThumbnailJob {
  name: string;
  archetypeNumber: number;
  topic: string;
  text: string;
  customPrompt: string;
}

const jobs: ThumbnailJob[] = [
  {
    name: '02-delete-gmail',
    archetypeNumber: 2,
    topic: 'How to delete Gmail',
    text: 'DELETE GMAIL',
    customPrompt: `${CONSISTENT_PERSONA} He looks concerned while pointing at a Gmail icon. A striking YouTube thumbnail with bold text "DELETE GMAIL" in large red letters. Red warning colors create urgency. 16:9 aspect ratio.`
  },
  {
    name: '03-excel-tutorial',
    archetypeNumber: 5,
    topic: 'Full beginner tutorial Excel',
    text: 'EXCEL FOR BEGINNERS',
    customPrompt: `${CONSISTENT_PERSONA} He smiles confidently while pointing at an Excel spreadsheet icon. An educational YouTube thumbnail with bold text "EXCEL FOR BEGINNERS" clearly visible. Friendly, professional colors with clean layout. 16:9 aspect ratio.`
  },
  {
    name: '04-quit-word',
    archetypeNumber: 4,
    topic: 'I quit Word',
    text: 'I QUIT WORD',
    customPrompt: `${CONSISTENT_PERSONA} He shows a determined, rebellious expression while pointing away from a Microsoft Word icon. A dramatic YouTube thumbnail with bold text "I QUIT WORD" in large letters. Strong contrast with edgy design. 16:9 aspect ratio.`
  },
  {
    name: '05-chatgpt-vs-gemini',
    archetypeNumber: 7,
    topic: 'ChatGPT vs Gemini',
    text: 'ChatGPT VS GEMINI',
    customPrompt: `${CONSISTENT_PERSONA} He stands between ChatGPT and Gemini logos, pointing at both with excitement. An exciting comparison YouTube thumbnail with bold text "ChatGPT VS GEMINI" with dramatic VS styling. Split-screen effect with vibrant colors. 16:9 aspect ratio.`
  },
  {
    name: '06-notion-workspace',
    archetypeNumber: 3,
    topic: 'Ultimate Notion workspace setup',
    text: 'NOTION WORKSPACE',
    customPrompt: `${CONSISTENT_PERSONA} He gestures enthusiastically toward a beautiful Notion dashboard. A sleek productivity YouTube thumbnail with bold text "NOTION WORKSPACE" prominently displayed. Modern, clean aesthetic with productivity vibes. 16:9 aspect ratio.`
  },
  {
    name: '07-keyboard-shortcuts',
    archetypeNumber: 6,
    topic: '50 keyboard shortcuts you need to know',
    text: '50 SHORTCUTS',
    customPrompt: `${CONSISTENT_PERSONA} He enthusiastically points at a glowing keyboard. An energetic tech YouTube thumbnail with bold text "50 SHORTCUTS" in large letters. Bright, tech-focused colors with dynamic composition. 16:9 aspect ratio.`
  }
];

async function generateThumbnail(job: ThumbnailJob): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎨 Generating: ${job.name}`);
  console.log(`   Topic: ${job.topic}`);
  console.log(`   Archetype: ${job.archetypeNumber}`);
  console.log(`${'='.repeat(60)}\n`);

  const profile: payloadEngine.HardcodedProfile = {
    name: 'Batch Test',
    systemPrompt: job.customPrompt,
    personaPath: path.resolve('assets/test/persona.jpg'),
    logoPath: path.resolve('assets/test/logo.png'),
  };

  // Handle different archetype file naming
  let archetypePath: string;
  if (job.archetypeNumber === 2) {
    archetypePath = path.resolve('assets/test/archetype2.jpg');
  } else {
    archetypePath = path.resolve(`assets/test/archetype${job.archetypeNumber}.jpeg`);
  }

  const archetype: payloadEngine.HardcodedArchetype = {
    name: `Archetype ${job.archetypeNumber}`,
    referencePath: archetypePath,
    layoutInstructions: `Style reference for ${job.topic}`,
  };

  const jobConfig: payloadEngine.JobConfig = {
    videoTopic: job.topic,
    thumbnailText: job.text,
  };

  const payload = await payloadEngine.assemblePayload(profile, archetype, jobConfig);

  console.log(`✓ Payload assembled`);
  console.log(`   Prompt: ${payload.systemPrompt.substring(0, 80)}...`);

  const { buffer: imageBuffer, fallbackUsed } = await generationService.callNanoBanana(
    payload,
    process.env.GOOGLE_API_KEY!
  );

  console.log(`✓ Generation complete: ${imageBuffer.length} bytes${fallbackUsed ? ' (Fallback used)' : ''}`);

  const outputPath = `output/${job.name}.png`;
  await generationService.saveOutputBuffer(imageBuffer, outputPath);

  console.log(`✅ Saved: ${outputPath}\n`);
}

async function main() {
  console.log('🚀 Batch Thumbnail Generation\n');
  console.log(`Processing ${jobs.length} thumbnails...\n`);

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not found in environment variables.');
  }

  let successCount = 0;
  let failCount = 0;

  for (const job of jobs) {
    try {
      await generateThumbnail(job);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed: ${job.name}`);
      console.error(`   Error: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Batch Generation Complete');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/${jobs.length}`);
  console.log(`❌ Failed: ${failCount}/${jobs.length}`);
  console.log('\nCheck the output/ directory for generated thumbnails.');
}

main().catch((error) => {
  console.error('\n❌ Batch generation failed:');
  console.error(error);
  process.exit(1);
});
