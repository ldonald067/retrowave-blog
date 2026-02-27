import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock parseYouTube utilities
vi.mock('../../utils/parseYouTube', () => ({
  parseYouTubeUrl: vi.fn(),
  fetchYouTubeTitle: vi.fn(),
}));

import { useYouTubeInfo } from '../useYouTubeInfo';
import { parseYouTubeUrl, fetchYouTubeTitle } from '../../utils/parseYouTube';

describe('useYouTubeInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for null URL', () => {
    const { result } = renderHook(() => useYouTubeInfo(null));
    expect(result.current).toBeNull();
  });

  it('returns null for undefined URL', () => {
    const { result } = renderHook(() => useYouTubeInfo(undefined));
    expect(result.current).toBeNull();
  });

  it('returns null for unparseable URL', async () => {
    vi.mocked(parseYouTubeUrl).mockReturnValue(null);

    const { result } = renderHook(() => useYouTubeInfo('https://example.com'));

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
    expect(parseYouTubeUrl).toHaveBeenCalledWith('https://example.com');
  });

  it('returns parsed info for valid YouTube URL', async () => {
    const mockInfo = {
      videoId: 'abc123',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/mqdefault.jpg',
      embedUrl: 'https://www.youtube.com/embed/abc123',
      watchUrl: 'https://www.youtube.com/watch?v=abc123',
    };
    vi.mocked(parseYouTubeUrl).mockReturnValue(mockInfo);
    vi.mocked(fetchYouTubeTitle).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useYouTubeInfo('https://www.youtube.com/watch?v=abc123'),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current?.videoId).toBe('abc123');
    expect(result.current?.embedUrl).toBe('https://www.youtube.com/embed/abc123');
  });

  it('fetches and adds title asynchronously', async () => {
    const mockInfo = {
      videoId: 'xyz789',
      thumbnailUrl: 'https://img.youtube.com/vi/xyz789/mqdefault.jpg',
      embedUrl: 'https://www.youtube.com/embed/xyz789',
      watchUrl: 'https://www.youtube.com/watch?v=xyz789',
    };
    vi.mocked(parseYouTubeUrl).mockReturnValue(mockInfo);
    vi.mocked(fetchYouTubeTitle).mockResolvedValue('My Cool Video');

    const { result } = renderHook(() =>
      useYouTubeInfo('https://youtu.be/xyz789'),
    );

    // Wait for async title fetch
    await waitFor(() => {
      expect(result.current?.title).toBe('My Cool Video');
    });

    expect(fetchYouTubeTitle).toHaveBeenCalledWith('xyz789');
  });

  it('does not update state after unmount (cleanup)', async () => {
    const mockInfo = {
      videoId: 'cleanup1',
      thumbnailUrl: 'https://img.youtube.com/vi/cleanup1/mqdefault.jpg',
      embedUrl: 'https://www.youtube.com/embed/cleanup1',
      watchUrl: 'https://www.youtube.com/watch?v=cleanup1',
    };
    vi.mocked(parseYouTubeUrl).mockReturnValue(mockInfo);

    // Create a deferred promise we can resolve after unmount
    let resolveTitle!: (val: string | null) => void;
    const titlePromise = new Promise<string | null>((resolve) => {
      resolveTitle = resolve;
    });
    vi.mocked(fetchYouTubeTitle).mockReturnValue(titlePromise);

    const { result, unmount } = renderHook(() =>
      useYouTubeInfo('https://youtu.be/cleanup1'),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    // Unmount before the title resolves
    unmount();

    // Resolve the title — should not cause a state update (no act warning)
    resolveTitle('Late Title');

    // If cleanup works, no React warnings about state updates on unmounted components
  });
});
