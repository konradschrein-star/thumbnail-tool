import { promises as fs } from 'fs';
import { resolve, join } from 'path';
import { EMERGENCY_ASSET_MAP } from './emergency-assets';

/**
 * Job configuration for a single thumbnail generation request
 */
export interface JobConfig {
  videoTopic: string;
  thumbnailText: string;
}

export interface HardcodedProfile {
  name: string;
  systemPrompt: string;
  personaPath: string;
  logoPath?: string;
}

export interface HardcodedArchetype {
  name: string;
  referencePath: string;
  layoutInstructions: string;
}

/**
 * Complete AI request payload with prompts and encoded images
 */
export interface AIRequestPayload {
  systemPrompt: string;
  userPrompt: string;
  base64Images: {
    archetype: { data: string; mimeType: string };
    persona: { data: string; mimeType: string };
    logo?: { data: string; mimeType: string };
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
 * Encodes an image to base64 and detects its MIME type.
 * Aggressively attempts local resolution for any internal paths/URLs.
 */
export async function encodeImageToBase64(pathOrUrl: string): Promise<{ data: string; mimeType: string }> {
  if (!pathOrUrl) return { data: '', mimeType: 'image/jpeg' };

  try {
    const projectRoot = process.cwd();
    let localBuffer: Buffer | null = null;
    let internalPath: string | null = null;

    // 0. Emergency Asset Map Check (Zero-Latency Fallback)
    const filename = pathOrUrl.split('/').pop()?.split('?')[0];
    if (filename && EMERGENCY_ASSET_MAP[filename]) {
      console.log(`[STORAGE] Using embedded asset for ${filename}`);
      let data = EMERGENCY_ASSET_MAP[filename];

      // Strip data URL prefix if it exists
      if (data.includes(';base64,')) {
        data = data.split(';base64,').pop()!;
      }

      const mimeType = detectMimeTypeFromBase64(data);
      console.log(`[ENCODER] Embedded ${filename}: ${mimeType} (${(data.length * 0.75 / 1024).toFixed(1)}KB)`);
      return { data, mimeType };
    }

    // 1. Candidate Extraction
    if (pathOrUrl.startsWith('http')) {
      try {
        const url = new URL(pathOrUrl);
        if (
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname.includes('vercel.app') ||
          url.hostname.includes('next-auth')
        ) {
          internalPath = url.pathname;
        }
      } catch (e) { }
    } else {
      internalPath = pathOrUrl;
    }

    // 2. Try Local Filesystem Resolve (Aggressive)
    if (internalPath) {
      const cleanPath = internalPath.split('?')[0].startsWith('/')
        ? internalPath.split('?')[0].slice(1)
        : internalPath.split('?')[0];

      const candidates = [
        join(projectRoot, 'public', cleanPath),
        join(projectRoot, 'assets', cleanPath),
        join(projectRoot, cleanPath),
        resolve(projectRoot, cleanPath)
      ];

      for (const candidate of candidates) {
        try {
          const normalized = resolve(candidate);
          if (normalized.startsWith(resolve(projectRoot))) {
            const stats = await fs.stat(normalized);
            if (stats.isFile()) {
              localBuffer = await fs.readFile(normalized);
              console.log(`[STORAGE] Resolved ${pathOrUrl} locally at ${normalized}`);
              break;
            }
          }
        } catch (err) { }
      }
    }

    let buffer: Buffer;
    if (localBuffer) {
      buffer = localBuffer;
    } else if (pathOrUrl.startsWith('http')) {
      const response = await fetch(pathOrUrl, {
        headers: { 'User-Agent': 'ThumbnailCreator/2.0' },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      throw new Error(`Could not resolve: ${pathOrUrl}`);
    }

    const mimeType = detectMimeType(buffer);
    const base64Data = buffer.toString('base64');

    const sizeKB = buffer.length / 1024;
    console.log(`[ENCODER] Success: ${pathOrUrl} -> ${mimeType} (${sizeKB.toFixed(1)}KB)`);

    if (sizeKB > 4096) {
      console.warn(`[ENCODER WARNING] Image ${pathOrUrl} is very large (${sizeKB.toFixed(1)}KB). AI might reject it.`);
    }

    return { data: base64Data, mimeType };

  } catch (error: any) {
    console.error(`[ENCODER ERROR] ${pathOrUrl}:`, error.message);
    throw new Error(`Failed to encode image: ${error.message}`);
  }
}

function detectMimeType(buffer: Buffer): string {
  if (buffer.length < 4) return 'image/jpeg';

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // WEBP: RIFF .... WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  // GIF: GIF8
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }

  return 'image/jpeg';
}

function detectMimeTypeFromBase64(base64: string): string {
  try {
    // Strip prefix if it exists
    const cleanBase64 = base64.includes(';base64,') ? base64.split(';base64,').pop()! : base64;
    const binary = Buffer.from(cleanBase64.substring(0, 32), 'base64');
    return detectMimeType(binary);
  } catch (e) {
    return 'image/jpeg';
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
  channel: any | HardcodedProfile,
  archetype: any | HardcodedArchetype,
  job: JobConfig,
  baseUrl: string = ''
): Promise<AIRequestPayload> {
  const brand = getBrandingContext(job.videoTopic, channel);
  const systemPrompt = buildSystemPrompt(channel, archetype, brand);
  const userPrompt = buildUserPrompt(job, !!(channel.logoAssetPath || channel.logoPath));

  const personaPath = channel.personaAssetPath || channel.personaPath;
  const logoPath = channel.logoAssetPath || channel.logoPath;
  const archetypeUrl = archetype.imageUrl || archetype.referencePath;

  const encodingTasks: Promise<{ data: string; mimeType: string } | undefined>[] = [
    encodeImageToBase64(archetypeUrl.startsWith('http') ? archetypeUrl : `${baseUrl}${archetypeUrl}`),
    personaPath ? encodeImageToBase64(personaPath.startsWith('http') ? personaPath : `${baseUrl}${personaPath}`) : Promise.resolve(undefined),
    logoPath ? encodeImageToBase64(logoPath.startsWith('http') ? logoPath : `${baseUrl}${logoPath}`) : Promise.resolve(undefined),
  ];

  const [archetypeResult, personaResult, logoResult] = await Promise.all(encodingTasks);

  if (!archetypeResult || !archetypeResult.data) throw new Error("Archetype image is required");
  if (!personaResult || !personaResult.data) throw new Error("Persona image is required");

  return {
    systemPrompt,
    userPrompt,
    base64Images: {
      archetype: archetypeResult,
      persona: personaResult,
      ...(logoResult && logoResult.data ? { logo: logoResult } : {}),
    },
  };
}
