// Link preview and metadata extraction
// Uses oEmbed protocol and public APIs - legally safe!

import type {
  LinkPreview,
  LinkType,
  VimeoOEmbedResponse,
  SpotifyMetadata,
} from '../types/link-preview';
import {
  extractYouTubeId,
  parseYouTubeUrl,
  hasYouTubeUrl,
  fetchYouTubeTitle,
} from '../utils/parseYouTube';

// Re-export YouTube utilities for consumers of this module
export { extractYouTubeId, parseYouTubeUrl, hasYouTubeUrl };

// Extract Vimeo video ID
export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] ?? null;
}

// Extract Spotify track/playlist/album ID
export function extractSpotifyId(url: string): SpotifyMetadata | null {
  const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
  if (match && (match[1] === 'track' || match[1] === 'playlist' || match[1] === 'album')) {
    return { type: match[1], id: match[2]! };
  }
  return null;
}

// Detect link type
export function detectLinkType(url: string): LinkType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('spotify.com')) return 'spotify';
  return 'generic';
}

// Fetch YouTube metadata using the cached oEmbed fetcher from parseYouTube.ts
export async function fetchYouTubeMetadata(videoId: string): Promise<LinkPreview | null> {
  const title = await fetchYouTubeTitle(videoId);

  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    type: 'youtube',
    title: title ?? undefined,
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    siteName: 'YouTube',
  };
}

// Fetch Vimeo metadata using oEmbed
export async function fetchVimeoMetadata(videoId: string): Promise<LinkPreview | null> {
  try {
    const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
    const response = await fetch(oEmbedUrl);

    if (!response.ok) return null;

    const data = (await response.json()) as VimeoOEmbedResponse;

    return {
      url: `https://vimeo.com/${videoId}`,
      type: 'vimeo',
      title: data.title,
      author: data.author_name,
      thumbnail: data.thumbnail_url,
      embedHtml: data.html,
      siteName: 'Vimeo',
    };
  } catch {
    return null;
  }
}

// Fetch Spotify metadata (embed only, no API key needed)
export function fetchSpotifyMetadata(type: string, id: string): LinkPreview {
  const url = `https://open.spotify.com/${type}/${id}`;

  return {
    url,
    type: 'spotify',
    title: `Spotify ${type}`,
    embedHtml: `<iframe src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="380" frameBorder="0" allowtransparency="true" allow="encrypted-media"></iframe>`,
    siteName: 'Spotify',
  };
}

// Main function to get link preview
export async function getLinkPreview(url: string): Promise<LinkPreview | null> {
  const type = detectLinkType(url);

  switch (type) {
    case 'youtube': {
      const videoId = extractYouTubeId(url);
      if (videoId) return fetchYouTubeMetadata(videoId);
      break;
    }
    case 'vimeo': {
      const videoId = extractVimeoId(url);
      if (videoId) return fetchVimeoMetadata(videoId);
      break;
    }
    case 'spotify': {
      const spotify = extractSpotifyId(url);
      if (spotify) return fetchSpotifyMetadata(spotify.type, spotify.id);
      break;
    }
    case 'twitter': {
      // Twitter/X requires API keys, so we'll just show a basic preview
      return {
        url,
        type: 'twitter',
        title: 'Twitter Post',
        siteName: 'Twitter',
      };
    }
    case 'generic': {
      // For generic links, we can try to fetch Open Graph metadata
      // but we'll need a server-side proxy to avoid CORS issues
      return {
        url,
        type: 'generic',
        siteName: new URL(url).hostname,
      };
    }
  }

  return null;
}

