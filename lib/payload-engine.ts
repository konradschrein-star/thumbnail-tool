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
    // 0. Handle Internal Proxy Paths (Zero-Latency Internal Fetch)
    if (pathOrUrl.startsWith('/api/assets/')) {
      const key = pathOrUrl.replace('/api/assets/', '');
      console.log(`[STORAGE] Internal Fetch: ${key}`);
      const { buffer, contentType } = await getObjectFromR2(key);
      return { data: buffer.toString('base64'), mimeType: contentType };
    }

    // 0.1 Handle Legacy Public R2 URLs (Migration Safety)
    const publicR2Domain = process.env.R2_PUBLIC_URL || '';
    if (publicR2Domain && pathOrUrl.startsWith(publicR2Domain)) {
      const key = pathOrUrl.replace(publicR2Domain, '').replace(/^\//, '');
      console.log(`[STORAGE] Legacy R2 Migration Fetch: ${key}`);
      const { buffer, contentType } = await getObjectFromR2(key);
      return { data: buffer.toString('base64'), mimeType: contentType };
    }

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
      // 3. Validate URL for SSRF Protection
      if (!isSafeUrl(pathOrUrl)) {
        throw new Error(`SSRF Blocked: Invalid or unsafe URL: ${pathOrUrl}`);
      }

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
    // Instead of throwing and blowing up the entire generation process,
    // we return a safe empty image structure if we can't find an optional asset.
    return { data: '', mimeType: 'image/jpeg' };
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

  // We heavily favor topic-based color theory now
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
    'github': { p: "#24292e", s: "#ffffff" },
    'notion': { p: "#000000", s: "#ffffff" }
  };

  for (const [platform, colors] of Object.entries(platforms)) {
    if (p.includes(platform)) {
      primary = colors.p;
      secondary = colors.s;
      break;
    }
  }

  return { primaryColor: primary, secondaryColor: secondary, tags: [] };
}

/**
 * Builds the comprehensive text prompt that will be sent to the generation engine.
 * Fully visible and editable by the user.
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
  
  // Use the archetype's dedicated basePrompt if it exists, otherwise use its layoutInstructions
  const archetypeStyle = sanitizePrompt(archetype.basePrompt || archetype.layoutInstructions || '', 2000);
  
  let prompt = `You are an expert YouTube thumbnail designer with 6 years of experience. Your task is to adapt the thumbnail style, typography, and stylistic devices to perfectly match the target audience of the video topic provided.\n\n`;
  
  prompt += `TOPIC: [${topic}]\n`;
  if (text) {
    prompt += `TEXT TO RENDER: "[${text}]"\n`;
  } else {
    prompt += `TEXT TO RENDER: DO NOT RENDER ANY TEXT ON THE THUMBNAIL. (Text on logos is allowed.)\n`;
  }
  prompt += `\nTECHNICAL INSTRUCTIONS:\n`;
  prompt += `- REFERENCE USAGE: The reference image dictates the core layout, composition, and general style. Any text on the reference image is merely a placeholder to define the text area/layout and should be ignored or replaced. Any person on the reference image must be entirely erased and replaced with the Persona described below.\n`;
  
  if (archetypeStyle) {
    prompt += `- ARCHETYPE STYLE: [${archetypeStyle}]\n`;
  }
  
  if (includeBrandColors) {
    const brand = getBrandingContext(topic, channel);
    prompt += `- COLOR THEORY: Maximally utilize the topic's identity colors (e.g., Snapchat = Yellow, WhatsApp = Green) to dominate the scene. Delicately and harmonically integrate the brand colors ([${brand.primaryColor}], [${brand.secondaryColor}]) as subtle accents only, ensuring they do not clash with or overpower the topic's main colors.\n`;
  } else {
    prompt += `- COLOR THEORY: Maximally utilize the topic's identity colors (e.g., Snapchat = Yellow, WhatsApp = Green) to dominate the scene.\n`;
  }
  
  prompt += `- LOGOS: Integrate official topic-related logos where appropriate. Do not hallucinate random watermarks.\n`;
  
  if (includePersona && channel.personaDescription) {
    const personaDesc = sanitizePrompt(channel.personaDescription, 1000);
    prompt += `- PERSONA: You must strictly follow this character description to generate the new person: [${personaDesc}]\n`;
  }

  return prompt;
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
  // If the prompt hasn't been manually overridden in the DB job yet, generate it
  const userPrompt = job.customPrompt || buildFullPrompt(channel, archetype, job, true, !!channel.personaAssetPath);

  const personaPath = channel.personaAssetPath || channel.personaPath;
  const archetypeUrl = archetype.imageUrl || archetype.referencePath;

  const encodingTasks: Promise<{ data: string; mimeType: string } | undefined>[] = [
    encodeImageToBase64(archetypeUrl.startsWith('http') ? archetypeUrl : `${baseUrl}${archetypeUrl}`),
    personaPath ? encodeImageToBase64(personaPath.startsWith('http') ? personaPath : `${baseUrl}${personaPath}`) : Promise.resolve(undefined),
  ];

  const [archetypeResult, personaResult] = await Promise.all(encodingTasks);

  if (!archetypeResult || !archetypeResult.data) throw new Error("Archetype image is required");

  return {
    systemPrompt: "You are an expert AI image generator fine-tuned for high-CTR YouTube thumbnails.",
    userPrompt,
    base64Images: {
      archetype: archetypeResult,
      ...(personaResult && personaResult.data ? { persona: personaResult } : {}),
    },
  };
}

/**
 * Validates a URL to prevent SSRF (Server-Side Request Forgery).
 * Blocks private IP ranges and loopback addresses.
 */
function isSafeUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);

    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const host = url.hostname.toLowerCase();

    // Block common local/private hostnames and IPs
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHosts.includes(host)) return false;

    // Block private IP ranges (Regex check for simplicity)
    const privateIpRegex = /^(10\.|127\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/;
    if (privateIpRegex.test(host)) return false;

    // Additional check for AWS/Cloud provider metadata services
    if (host === '169.254.169.254') return false;

    return true;
  } catch (e) {
    return false;
  }
}
