import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock supabase — all variables must be inside the factory to avoid hoisting issues
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Mock withRetry to pass through the async fn
vi.mock('../../lib/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

// Mock requireAuth — default: logged in
vi.mock('../../lib/auth-guard', () => ({
  requireAuth: vi.fn(),
}));

import { useChapters } from '../useChapters';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth-guard';

const mockUser = { id: 'user-1', email: 'test@test.com' };

const mockChapters = [
  { chapter: 'summer 2025', post_count: 5, latest_post: '2025-08-15T00:00:00Z' },
  { chapter: 'road trip', post_count: 3, latest_post: '2025-07-01T00:00:00Z' },
];

describe('useChapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, error: null } as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockChapters, error: null } as never);
  });

  // ── Fetch on mount ──────────────────────────────────────────────────────

  it('fetches chapters on mount', async () => {
    const { result } = renderHook(() => useChapters());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabase.rpc).toHaveBeenCalledWith('get_user_chapters');
    expect(result.current.chapters).toHaveLength(2);
    expect(result.current.chapters[0]?.chapter).toBe('summer 2025');
    expect(result.current.chapters[1]?.post_count).toBe(3);
  });

  // ── Auth guard ──────────────────────────────────────────────────────────

  it('returns empty chapters when not logged in', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      user: null,
      error: 'You must be logged in.',
    } as never);

    const { result } = renderHook(() => useChapters());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chapters).toHaveLength(0);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  // ── RPC error ───────────────────────────────────────────────────────────

  it('returns empty chapters on RPC error (silent fail)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC failed', code: '500' },
    } as never);

    const { result } = renderHook(() => useChapters());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chapters).toHaveLength(0);
  });

  // ── Refetch ─────────────────────────────────────────────────────────────

  it('refetch re-fetches chapters', async () => {
    const { result } = renderHook(() => useChapters());

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

  // ── Null data ───────────────────────────────────────────────────────────

  it('handles null data gracefully (defaults to empty array)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: null,
    } as never);

    const { result } = renderHook(() => useChapters());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chapters).toHaveLength(0);
  });
});
