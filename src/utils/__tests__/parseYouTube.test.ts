import { describe, it, expect } from 'vitest';
import { extractYouTubeId, parseYouTubeUrl } from '../parseYouTube';

describe('extractYouTubeId', () => {
  it('returns null for empty/falsy input', () => {
    expect(extractYouTubeId('')).toBeNull();
    expect(extractYouTubeId(null as unknown as string)).toBeNull();
  });

  it('extracts ID from standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from watch URL with extra params', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?list=PLx&v=dQw4w9WgXcQ&t=42')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extracts ID from short youtu.be URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from old /v/ URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from YouTube Music URL', () => {
    expect(extractYouTubeId('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extracts ID from Shorts URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeId('https://vimeo.com/12345')).toBeNull();
  });

  it('returns null for plain text with no URL', () => {
    expect(extractYouTubeId('just some song name - artist')).toBeNull();
  });
});

describe('parseYouTubeUrl', () => {
  it('returns null for non-YouTube text', () => {
    expect(parseYouTubeUrl('not a youtube link')).toBeNull();
  });

  it('returns full info object for valid URL', () => {
    const info = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(info).toEqual({
      videoId: 'dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      watchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
  });

  it('does not include title (title comes from async fetch)', () => {
    const info = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(info?.title).toBeUndefined();
  });
});
