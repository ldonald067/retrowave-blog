// Link preview type definitions

export interface LinkPreview {
  url: string;
  type: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  embedHtml?: string;
  author?: string;
  siteName?: string;
}

export type LinkType = 'youtube' | 'vimeo' | 'twitter' | 'spotify' | 'generic';

export interface YouTubeOEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
}

export interface VimeoOEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
}

export interface SpotifyMetadata {
  type: 'track' | 'playlist' | 'album';
  id: string;
}

export interface DetectedUrl {
  start: number;
  end: number;
  url: string;
}

