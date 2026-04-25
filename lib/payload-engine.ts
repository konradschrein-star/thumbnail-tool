import { promises as fs } from 'fs';
import { resolve, join } from 'path';
import { EMERGENCY_ASSET_MAP } from './emergency-assets';

/**
 * Job configuration for a single thumbnail generation request
 */
export interface JobConfig {
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
}

export interface HardcodedProfile {
  name: string;
  systemPrompt: string;
  personaPath: string;
  logoPath?: string;
  personaDescription: string;
}

export interface HardcodedArchetype {
  name: string;
  referencePath: string;
  layoutInstructions: string;
  imageUrl?: string;
}

/**
 * Complete AI request payload with prompts and encoded images
 */
export interface AIRequestPayload {
  systemPrompt: string;
  userPrompt: string;
  base64Images: {
    archetype: { data: string; mimeType: string };
    persona?: { data: string; mimeType: string };
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
 * Validates prompt length to prevent API errors
 * Google Nano Banana typically has a ~2000-3000 character limit for prompts
 */
export function validatePromptLength(prompt: string, maxLength: number = 2000): { valid: boolean; length: number; error?: string } {
  const length = prompt.length;
  if (length > maxLength) {
    return {
      valid: false,
      length,
      error: `Prompt too long (${length} characters). Maximum allowed: ${maxLength} characters.`
    };
  }
  return { valid: true, length };
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

    const filename = pathOrUrl.split('/').pop()?.split('?')[0];
    if (filename && EMERGENCY_ASSET_MAP[filename]) {
      let data = EMERGENCY_ASSET_MAP[filename];
      if (data.includes(';base64,')) {
        data = data.split(';base64,').pop()!;
      }
      return { data, mimeType: detectMimeTypeFromBase64(data) };
    }

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
      if (!isSafeUrl(pathOrUrl)) throw new Error(`SSRF Blocked: ${pathOrUrl}`);
      const response = await fetch(pathOrUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      throw new Error(`Could not resolve: ${pathOrUrl}`);
    }

    return { data: buffer.toString('base64'), mimeType: detectMimeType(buffer) };
  } catch (error) {
    return { data: '', mimeType: 'image/jpeg' };
  }
}

function detectMimeType(buffer: Buffer): string {
  if (buffer.length < 4) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'image/webp';
  return 'image/jpeg';
}

function detectMimeTypeFromBase64(base64: string): string {
  try {
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
export function getBrandingContext(topic: string, channel: any): BrandContext {
  const p = topic.toLowerCase();
  const channelTags = channel.tags?.toLowerCase().split(',').map((t: string) => t.trim()) || [];

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
    'linkedin': { p: "#0077B5", s: "#FFFFFF" },
    'powerpoint': { p: "#B7472A", s: "#FFFFFF" }
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
 * Builds a condensed prompt for AI33 (which has strict prompt length limits)
 */
export function buildCondensedPrompt(
  channel: any,
  archetype: any,
  job: JobConfig
): string {
  const topic = sanitizePrompt(job.videoTopic, 80);
  const text = sanitizePrompt(job.thumbnailText, 40);
  const style = archetype.name || 'modern YouTube';

  return `Create a ${style} style YouTube thumbnail for: "${topic}". Include text: "${text}". High quality, vibrant colors, professional design.`;
}

/**
 * Builds a concise prompt for image generation (optimized for API limits)
 */
export function buildFullPrompt(
  channel: any,
  archetype: any,
  job: JobConfig,
  includeBrandColors: boolean,
  includePersona: boolean
): string {
  const topic = sanitizePrompt(job.videoTopic, 100);
  const text = sanitizePrompt(job.thumbnailText, 50);
  const brand = getBrandingContext(job.videoTopic, channel);

  // Build concise style instruction (max 200 chars from archetype)
  const styleHint = sanitizePrompt(archetype.basePrompt || archetype.layoutInstructions || 'modern YouTube thumbnail style', 200);

  // Build persona section (max 300 chars)
  const personaSection = includePersona && channel.personaDescription
    ? `Character: ${sanitizePrompt(channel.personaDescription, 300)}.`
    : '';

  // Build color section
  const colorSection = includeBrandColors
    ? `Colors: ${brand.primaryColor} and ${brand.secondaryColor}.`
    : '';

  // Handle empty text field - if no text provided, remove all text from reference
  const textRule = text && text.trim().length > 0
    ? `Replace ONLY the main headline text in the reference thumbnail with "${text}". Keep logos, UI elements, and secondary text unchanged.`
    : 'Remove all headline and title text from the reference thumbnail. Keep logos and UI elements unchanged.';

  // Concise, focused prompt with strict rules to prevent unwanted behavior
  return `Create a YouTube thumbnail matching the reference image's visual style, layout, and composition.

CRITICAL RULES:
1. TEXT REPLACEMENT: ${textRule}
2. TOPIC CHANGE: The thumbnail is about "${topic}". Completely disregard and replace any subject or topic from the reference thumbnail.
3. CHARACTER REPLACEMENT: ${includePersona && channel.personaDescription ? `Replace any character in the reference image with this character: ${sanitizePrompt(channel.personaDescription, 300)}. Match their pose and position.` : 'If the reference has a character, keep the same pose and style but update to match the new topic. If no character exists, do not add one.'}

Style: ${styleHint}
${colorSection}

Match the reference image's composition, lighting, color scheme, and visual energy. Use vibrant colors and high contrast.`.trim();
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
  const userPrompt = job.customPrompt || buildFullPrompt(channel, archetype, job, true, !!channel.personaAssetPath);

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

  return {
    systemPrompt: "You are an expert AI image generator fine-tuned for high-CTR YouTube thumbnails.",
    userPrompt,
    base64Images: {
      archetype: archetypeResult,
      ...(personaResult && personaResult.data ? { persona: personaResult } : {}),
      ...(logoResult && logoResult.data ? { logo: logoResult } : {}),
    },
  };
}

function isSafeUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHosts.includes(host)) return false;
    const privateIpRegex = /^(10\.|127\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/;
    if (privateIpRegex.test(host)) return false;
    if (host === '169.254.169.254') return false;
    return true;
  } catch (e) {
    return false;
  }
}
