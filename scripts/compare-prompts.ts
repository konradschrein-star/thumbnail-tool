#!/usr/bin/env node

/**
 * Simple Prompt Comparison Tool
 * Shows the difference between full and condensed prompts
 */

import { buildFullPrompt, buildCondensedPrompt } from '../lib/payload-engine';

// Test data
const channel = {
  name: "PowerPoint Mastery",
  primaryColor: "#B7472A",
  secondaryColor: "#FFFFFF",
  tags: "powerpoint,tutorials,office",
  personaDescription: "A charismatic 35-year-old male educator with short brown hair, bright blue eyes, and an athletic build. He has a square jawline, well-groomed beard, and wears professional attire. His expression shows enthusiasm with wide eyes and an engaging smile.",
  personaAssetPath: "/test/persona.jpg"
};

const archetype = {
  name: "Bold Tutorial Style",
  basePrompt: "Professional YouTube tutorial aesthetic with dramatic lighting and bold typography.",
  layoutInstructions: "Upper-third text placement, high contrast, vibrant colors."
};

const job = {
  videoTopic: "How to master PowerPoint animations",
  thumbnailText: "MASTER POWERPOINT"
};

console.log('📊 PROMPT COMPARISON FOR AI33 INTEGRATION\n');
console.log('=' .repeat(70));

const fullPrompt = buildFullPrompt(channel, archetype, job, true, true);
const condensedPrompt = buildCondensedPrompt(channel, archetype, job);

console.log('\n1️⃣  FULL PROMPT (Used for Google Gemini):');
console.log('-'.repeat(70));
console.log(fullPrompt);
console.log(`\n📏 Length: ${fullPrompt.length} characters\n`);

console.log('\n2️⃣  CONDENSED PROMPT (Used for AI33):');
console.log('-'.repeat(70));
console.log(condensedPrompt);
console.log(`\n📏 Length: ${condensedPrompt.length} characters\n`);

console.log('\n📈 REDUCTION ANALYSIS:');
console.log('-'.repeat(70));
const reduction = ((1 - condensedPrompt.length / fullPrompt.length) * 100).toFixed(1);
const ratio = (fullPrompt.length / condensedPrompt.length).toFixed(1);
console.log(`✓ Size reduction: ${reduction}%`);
console.log(`✓ Compression ratio: ${ratio}:1`);
console.log(`✓ Characters saved: ${fullPrompt.length - condensedPrompt.length}`);

console.log('\n\n✅ VERIFICATION:');
console.log('-'.repeat(70));
console.log(`✓ Condensed prompt is under 500 chars: ${condensedPrompt.length < 500 ? 'YES' : 'NO'}`);
console.log(`✓ Still includes video topic: ${condensedPrompt.includes(job.videoTopic) ? 'YES' : 'NO'}`);
console.log(`✓ Still includes thumbnail text: ${condensedPrompt.includes(job.thumbnailText) ? 'YES' : 'NO'}`);
console.log(`✓ Still includes archetype style: ${condensedPrompt.includes(archetype.name) ? 'YES' : 'NO'}`);
console.log('\n');
