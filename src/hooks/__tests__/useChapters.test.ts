import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock('../../lib/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { useChapters } from '../useChapters';
import { supabase } from '../../lib/supabase';

const mockUser = { id: 'user-1', email: 'test@test.com' };

const mockChapters = [
  { chapter: 'summer 2025', post_count: 5, latest_post: '2025-08-15T00:00:00Z' },
  { chapter: 'road trip', post_count: 3, latest_post: '2025-07-01T00:00:00Z' },
];

describe('useChapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockChapters, error: null } as never);
  });

  it('fetches chapters when a user is present on mount', async () => {
    const { result } = renderHook(() => useChapters(mockUser.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabase.rpc).toHaveBeenCalledWith('get_user_chapters');
    expect(result.current.chapters).toHaveLength(2);
    expect(result.current.chapters[0]?.chapter).toBe('summer 2025');
    expect(result.current.chapters[1]?.post_count).toBe(3);
  });

  it('returns empty chapters when not logged in', async () => {
    const { result } = renderHook(() => useChapters(null));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chapters).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('loads chapters when a user signs in after starting signed out', async () => {
    const { result, rerender } = renderHook(({ userId }) => useChapters(userId), {
      initialProps: { userId: null as string | null },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chapters).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();

    rerender({ userId: mockUser.id });

    await waitFor(() => expect(result.current.chapters).toHaveLength(2));
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('clears chapters when the active user signs out', async () => {
    const { result, rerender } = renderHook(({ userId }) => useChapters(userId), {
      initialProps: { userId: mockUser.id as string | null },
    });

    await waitFor(() => expect(result.current.chapters).toHaveLength(2));

    rerender({ userId: null });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.chapters).toEqual([]);
    });
  });

  it('returns empty chapters on RPC error (silent fail)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC failed', code: '500' },
    } as never);

    try {
      const { result } = renderHook(() => useChapters(mockUser.id));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.chapters).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith('[useChapters] fetch failed:', {
        message: 'RPC failed',
        code: '500',
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('refetch re-fetches chapters', async () => {
    const { result } = renderHook(() => useChapters(mockUser.id));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(supabase.rpc).toHaveBeenCalledTimes(1);

    const updatedChapters = [
      ...mockChapters,
      { chapter: 'new chapter', post_count: 1, latest_post: '2025-09-01T00:00:00Z' },
    ];
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: updatedChapters,
      error: null,
    } as never);

    await act(async () => {
      await result.current.refetch();
    });

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(result.current.chapters).toHaveLength(3);
    expect(result.current.chapters[2]?.chapter).toBe('new chapter');
  });

  it('handles null data gracefully (defaults to empty array)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: null,
    } as never);

    const { result } = renderHook(() => useChapters(mockUser.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chapters).toHaveLength(0);
  });
});
