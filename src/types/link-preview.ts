// Link preview type definitions - reusable in React Native!

export type LinkType = 'youtube' | 'vimeo' | 'twitter' | 'spotify' | 'generic';

export interface LinkPreview {
  url: string;
  type: LinkType;
  title?: string;
  description?: string;
  thumbnail?: string;
  embedHtml?: string;
  author?: string;
  siteName?: string;
}

export interface YouTubeOEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
  provider_name: string;
}

export interface VimeoOEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
  provider_name: string;
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
