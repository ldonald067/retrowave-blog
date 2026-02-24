// YouTube URL parser utility
import { youtubeTitleCache } from '../lib/cache';

export interface YouTubeInfo {
  videoId: string;
  thumbnailUrl: string;
  embedUrl: string;
  watchUrl: string;
  title?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports: youtube.com/watch, youtu.be, youtube.com/embed, youtube.com/v, music.youtube.com
 */
export function extractYouTubeId(text: string): string | null {
  if (!text) return null;

  // Various YouTube URL patterns
  const patterns = [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Old embed: youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    // YouTube Music: music.youtube.com/watch?v=VIDEO_ID
    /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Shorts: youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Parse a YouTube URL and return video info
 */
export function parseYouTubeUrl(text: string): YouTubeInfo | null {
  const videoId = extractYouTubeId(text);
  if (!videoId) return null;

  return {
    videoId,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Check if text contains a YouTube URL
 */
export function hasYouTubeUrl(text: string): boolean {
  return extractYouTubeId(text) !== null;
}

/**
 * Fetch YouTube video title using oEmbed API (no API key required).
 * T4: Results are cached in-memory for 60 minutes to avoid repeated fetches.
 */
export async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  // Check cache first (includes cached null = previous failure)
  if (youtubeTitleCache.has(videoId)) {
    return youtubeTitleCache.get(videoId) ?? null;
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!response.ok) {
      youtubeTitleCache.set(videoId, null);
      return null;
    }
    const data = await response.json();
    const title: string | null = data.title || null;
    youtubeTitleCache.set(videoId, title);
    return title;
  } catch {
    youtubeTitleCache.set(videoId, null);
    return null;
  }
}

