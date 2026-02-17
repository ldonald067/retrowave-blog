import { describe, it, expect } from 'vitest';
import {
  extractYouTubeId,
  extractVimeoId,
  extractSpotifyId,
  detectUrlsInText,
} from '../linkPreview';

describe('extractYouTubeId', () => {
  it('extracts from standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from embed URL', () => {
    expect(extractYouTubeId('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeId('https://example.com')).toBeNull();
  });
});

describe('extractVimeoId', () => {
  it('extracts from standard URL', () => {
    expect(extractVimeoId('https://vimeo.com/123456789')).toBe('123456789');
  });

  it('returns null for non-Vimeo URL', () => {
    expect(extractVimeoId('https://example.com/123')).toBeNull();
  });
});

describe('extractSpotifyId', () => {
  it('extracts track metadata', () => {
    const result = extractSpotifyId('https://open.spotify.com/track/abc123');
    expect(result).toEqual({ type: 'track', id: 'abc123' });
  });

  it('extracts playlist metadata', () => {
    const result = extractSpotifyId('https://open.spotify.com/playlist/xyz789');
    expect(result).toEqual({ type: 'playlist', id: 'xyz789' });
  });

  it('extracts album metadata', () => {
    const result = extractSpotifyId('https://open.spotify.com/album/def456');
    expect(result).toEqual({ type: 'album', id: 'def456' });
  });

  it('returns null for non-Spotify URL', () => {
    expect(extractSpotifyId('https://example.com')).toBeNull();
  });
});

describe('detectUrlsInText', () => {
  it('detects URLs in text', () => {
    const result = detectUrlsInText('Check out https://example.com for more info');
    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe('https://example.com');
  });

  it('detects multiple URLs', () => {
    const result = detectUrlsInText('Visit https://a.com and https://b.com');
    expect(result).toHaveLength(2);
  });

  it('returns empty array for text without URLs', () => {
    expect(detectUrlsInText('No links here')).toEqual([]);
  });
});
