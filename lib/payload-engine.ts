import { promises as fs } from 'fs';
import { resolve, join } from 'path';
import { EMERGENCY_ASSET_MAP } from './emergency-assets';
import { getObjectFromR2 } from './r2-service';

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
 * Encodes an image to base64 and detects its MIME type.
 * Aggressively attempts local resolution for any internal paths/URLs.
 */
export async function encodeImageToBase64(pathOrUrl: string): Promise<{ data: string; mimeType: string }> {
  if (!pathOrUrl) return { data: '', mimeType: 'image/jpeg' };

  try {
    if (pathOrUrl.startsWith('/api/assets/')) {
      const key = pathOrUrl.replace('/api/assets/', '');
      const { buffer, contentType } = await getObjectFromR2(key);
      return { data: buffer.toString('base64'), mimeType: contentType };
    }

    const publicR2Domain = process.env.R2_PUBLIC_URL || '';
    if (publicR2Domain && pathOrUrl.startsWith(publicR2Domain)) {
      const key = pathOrUrl.replace(publicR2Domain, '').replace(/^\//, '');
      const { buffer, contentType } = await getObjectFromR2(key);
      return { data: buffer.toString('base64'), mimeType: contentType };
    }

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
 * Builds the comprehensive text prompt that will be sent to the generation engine.
 */
export function buildFullPrompt(
  channel: any,
  archetype: any,
  job: JobConfig,
  includeBrandColors: boolean,
  includePersona: boolean
): string {
  const topic = sanitizePrompt(job.videoTopic, 150);
  const text = sanitizePrompt(job.thumbnailText, 80);
  const brand = getBrandingContext(job.videoTopic, channel);
  const archetypeStyle = sanitizePrompt(archetype.basePrompt || archetype.layoutInstructions || '', 2000);

  return `You are an expert YouTube thumbnail designer with 10 years of experience. Your task is to adapt the thumbnail style, typography, and stylistic devices to perfectly match the target audience.

## Text Instructions
**Step 1**: Analyze the reference image for the presence of text or typography.
- **IF YES**: Render this text clearly: ${text || 'DO NOT RENDER ANY TEXT'}. Ensure it is highly legible, matches modern YouTube aesthetics, and uses ALL CAPS or Title Case consistently. Apply thick outer strokes or heavy drop shadows like in the reference image to create depth and maximum contrast.
- **IF NO**: Do not render any additional text, characters, or letters. Maintain the text-free composition of the reference.

## Technical Instructions
- **REFERENCE USAGE**: Use the provided reference image as the core style and layout inspiration. Maintain the general composition, object placement, and background style of the reference. Maintain vibrant high-contrast lighting and dramatic rim lighting on the subject.
- **ARCHETYPE STYLE**: ${archetypeStyle}
- **COLOR THEORY**: Utilize the topic's identity colors (e.g., PowerPoint = Orange/Red) to dominate the scene. **Ensure there is strong visual contrast and depth to keep elements separated and professional. Do not allow similar colors to blend together into a flat mess.** ${includeBrandColors ? `Harmonically integrate ${brand.primaryColor} and ${brand.secondaryColor} as high-contrast accents.` : ''}
- **LOGOS**: Integrate official topic-related logos where appropriate. Ensure they are vibrant and clearly visible.

## Persona Instructions
**Step 2**: Analyze the reference image for the presence of a person or character.
- **IF YES**: ${includePersona && channel.personaDescription ? `RETAIN the lighting, pose, and exact facial expression (e.g., wide eyes, open mouth, intense focus, thinking face) from the reference image, but COMPLETELY IGNORE the original person's facial features, bone structure, and identity. Entirely replace their identity with this Persona: [${sanitizePrompt(channel.personaDescription, 1000)}]` : 'Render a high-quality human subject matching the reference pose and expression.'}
- **IF NO**: Maintain the person-free composition of the reference image. Do not add any people, faces, or silhouettes.`;
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
