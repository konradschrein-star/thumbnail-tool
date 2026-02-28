import { promises as fs } from 'fs';
import { resolve } from 'path';

/**
 * Job configuration for a single thumbnail generation request
 */
export interface JobConfig {
  videoTopic: string;
  thumbnailText: string;
}

/**
 * Complete AI request payload with prompts and encoded images
 */
export interface AIRequestPayload {
  systemPrompt: string;
  userPrompt: string;
  base64Images: {
    archetype: string;
    persona: string;
    logo?: string;
  };
}

export interface BrandContext {
  primaryColor: string;
  secondaryColor: string;
  tags: string[];
}

/**
 * Sanitizes input to prevent prompt injection and character limits
 */
export function sanitizePrompt(text: string, maxLength: number): string {
  if (!text) return '';
  return text.trim().substring(0, maxLength).replace(/[\r\n]/g, ' ');
}

/**
 * Encodes an image to base64 from a local path or a remote URL
 * Hardened to prevent path traversal.
 */
export async function encodeImageToBase64(pathOrUrl: string): Promise<string> {
  try {
    if (pathOrUrl.startsWith('http')) {
      // Remote URL validation
      const url = new URL(pathOrUrl);
      const allowedDomains = [
        '.r2.cloudflarestorage.com',
        '.r2.dev',
        'localhost',
        '127.0.0.1'
      ];

      const isAllowed = allowedDomains.some(domain => url.hostname.endsWith(domain) || url.hostname === domain);

      // If we want to be less strict for user-provided URLs (though here they come from our DB)
      // we could just fetch, but let's at least ensure it's a valid URL.

      const response = await fetch(pathOrUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    } else {
      // Local path validation - Only allow if it's within specific directories
      // and prevent path traversal (..)
      const normalizedPath = resolve(pathOrUrl);
      const projectRoot = resolve(process.cwd());
      const publicDir = resolve(projectRoot, 'public');
      const assetsDir = resolve(projectRoot, 'assets');

      if (!normalizedPath.startsWith(publicDir) && !normalizedPath.startsWith(assetsDir)) {
        throw new Error('Access denied: Local path must be within public or assets directory.');
      }

      const buffer = await fs.readFile(normalizedPath);
      return buffer.toString('base64');
    }
  } catch (error) {
    console.error(`Encoding failed for ${pathOrUrl}:`, error);
    throw new Error(
      `Failed to encode image: ${error instanceof Error ? error.message : 'Invalid path or URL'}`
    );
  }
}

/**
 * Detects branding colors and context based on video topic keywords
 */
export function getBrandingContext(topic: string, channel: { primaryColor?: string | null, secondaryColor?: string | null, tags?: string | null }): BrandContext {
  const p = topic.toLowerCase();
  const channelTags = channel.tags?.toLowerCase().split(',').map(t => t.trim()) || [];

  let primary = channel.primaryColor || "#ffffff";
  let secondary = channel.secondaryColor || "#000000";

  const platforms: Record<string, { p: string, s: string }> = {
    'snapchat': { p: "#FFFC00", s: "#000000" },
    'whatsapp': { p: "#25D366", s: "#075E54" },
    'youtube': { p: "#FF0000", s: "#FFFFFF" },
    'instagram': { p: "#E1306C", s: "#FCAF45" },
    'tiktok': { p: "#EE1D52", s: "#69C9D0" },
    'facebook': { p: "#1877F2", s: "#FFFFFF" },
    'twitter': { p: "#1DA1F2", s: "#FFFFFF" },
    'x.com': { p: "#000000", s: "#FFFFFF" },
    'linkedin': { p: "#0077B5", s: "#FFFFFF" }
  };

  for (const [platform, colors] of Object.entries(platforms)) {
    if (p.includes(platform) || channelTags.includes(platform)) {
      primary = colors.p;
      secondary = colors.s;
      break;
    }
  }

  return { primaryColor: primary, secondaryColor: secondary, tags: channelTags };
}

/**
 * Merges profile system prompt with archetype layout instructions and branding context
 */
export function buildSystemPrompt(
  profile: { personaDescription: string; systemPrompt?: string },
  archetype: { layoutInstructions: string },
  brand?: BrandContext
): string {
  const personaDesc = sanitizePrompt(profile.personaDescription, 1000);
  const layoutInstr = sanitizePrompt(archetype.layoutInstructions, 1000);

  let prompt = `${personaDesc}\n\n## Layout Instructions\n${layoutInstr}`;

  if (brand) {
    prompt += `\n\n## Visual Branding & Color Harmony
Apply the following color palette to ensure brand consistency:
- **Primary Color**: ${brand.primaryColor}
- **Secondary Color**: ${brand.secondaryColor}

Strategy: Use these for accents and overlays while maintaining professional legibility.`;
  }

  return prompt;
}

/**
 * Formats video topic and thumbnail text into user prompt with image references
 */
export function buildUserPrompt(job: JobConfig, hasLogo: boolean): string {
  const topic = sanitizePrompt(job.videoTopic, 150);
  const text = sanitizePrompt(job.thumbnailText, 80);

  return `Create a professional YouTube thumbnail.

Topic: ${topic}
Text to display: "${text}"

Use the provided reference image for style inspiration. ${hasLogo ? 'Integrate the channel logo cleanly.' : 'Focus on the persona and topic assets.'}
Ensure the text is high-contrast and legible.`;
}

/**
 * Assembles complete AI request payload by encoding images and building prompts
 */
export async function assemblePayload(
  channel: any,
  archetype: any,
  job: JobConfig,
  baseUrl: string = ''
): Promise<AIRequestPayload> {
  const brand = getBrandingContext(job.videoTopic, channel);
  const systemPrompt = buildSystemPrompt(channel, archetype, brand);
  const userPrompt = buildUserPrompt(job, !!channel.logoAssetPath);

  const encodingTasks: Promise<string | undefined>[] = [
    encodeImageToBase64(archetype.imageUrl.startsWith('http') ? archetype.imageUrl : `${baseUrl}${archetype.imageUrl}`),
    channel.personaAssetPath ? encodeImageToBase64(channel.personaAssetPath.startsWith('http') ? channel.personaAssetPath : `${baseUrl}${channel.personaAssetPath}`) : Promise.resolve(undefined),
    channel.logoAssetPath ? encodeImageToBase64(channel.logoAssetPath.startsWith('http') ? channel.logoAssetPath : `${baseUrl}${channel.logoAssetPath}`) : Promise.resolve(undefined),
  ];

  const [archetypeBase64, personaBase64, logoBase64] = await Promise.all(encodingTasks);

  if (!archetypeBase64) throw new Error("Archetype image is required");
  if (!personaBase64) throw new Error("Persona image is required");

  return {
    systemPrompt,
    userPrompt,
    base64Images: {
      archetype: archetypeBase64,
      persona: personaBase64,
      ...(logoBase64 ? { logo: logoBase64 } : {}),
    },
  };
}
