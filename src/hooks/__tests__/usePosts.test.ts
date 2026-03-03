import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(),
  },
}));

// Mock withRetry to pass through
vi.mock('../../lib/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

// Mock postsCache
vi.mock('../../lib/cache', () => ({
  postsCache: {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    invalidateAll: vi.fn(),
  },
}));

// Mock auth-guard
vi.mock('../../lib/auth-guard', () => ({
  requireAuth: vi.fn(),
}));

// Mock validation (pass-through for most tests)
vi.mock('../../lib/validation', () => ({
  validatePostInput: vi.fn().mockReturnValue({}),
  validateEmbeddedLinks: vi.fn().mockReturnValue(null),
  hasValidationErrors: vi.fn().mockReturnValue(false),
}));

import { usePosts } from '../usePosts';
import { supabase } from '../../lib/supabase';
import { postsCache } from '../../lib/cache';
import { requireAuth } from '../../lib/auth-guard';
import { hasValidationErrors } from '../../lib/validation';

const mockUser = { id: 'user-1', email: 'test@example.com' };

const mockPost = {
  id: 'post-1',
  user_id: 'user-1',
  title: 'Test Post',
  content: 'Hello world',
  mood: null,
  music: null,
  embedded_links: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  reactions: { '❤️': 2 },
  user_reactions: ['❤️'],
  content_truncated: false,
  profile_display_name: 'Test User',
  profile_avatar_url: null,
};

describe('usePosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser,
      error: null,
    } as never);
    vi.mocked(hasValidationErrors).mockReturnValue(false);
  });

  // ── Initial load ────────────────────────────────────────────────────────

  it('starts in loading state then resolves with posts', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [mockPost],
      error: null,
    } as never);

    const { result } = renderHook(() => usePosts());
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0]?.id).toBe('post-1');
    expect(result.current.error).toBeNull();
  });

  it('sets error state on initial load failure', async () => {
    vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Unknown failure'));

    const { result } = renderHook(() => usePosts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Something went wrong. Please try again.');
    expect(result.current.posts).toHaveLength(0);
  });

  // ── createPost ──────────────────────────────────────────────────────────

  it('createPost inserts and prepends to posts list', async () => {
    // Initial load returns empty
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } as never);

    // Mock the insert chain
    const singleMock = vi.fn().mockResolvedValue({
      data: { ...mockPost, id: 'post-new' },
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never);

    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { data: unknown; error: string | null } = { data: null, error: null };
    await act(async () => {
      response = await result.current.createPost({
        title: 'New Post',
        content: 'New content',
      });
    });

    expect(response.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0]?.id).toBe('post-new');
  });

  it('createPost returns validation error without calling supabase', async () => {
    const { validatePostInput } = await import('../../lib/validation');
    vi.mocked(validatePostInput).mockReturnValueOnce({ title: 'Title is required' });
    vi.mocked(hasValidationErrors).mockReturnValueOnce(true);

    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { data: unknown; error: string | null } = { data: null, error: null };
    await act(async () => {
      response = await result.current.createPost({
        title: '',
        content: '',
      });
    });

    // Should return validation error without hitting supabase
    expect(response.error).toBe('Title is required');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('createPost returns auth error when not logged in', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      user: null,
      error: 'You must be logged in to do that.',
    } as never);

    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { data: unknown; error: string | null } = { data: null, error: null };
    await act(async () => {
      response = await result.current.createPost({
        title: 'Test',
        content: 'Test',
      });
    });

    expect(response.error).toBe('You must be logged in to do that.');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  // ── deletePost ──────────────────────────────────────────────────────────

  it('deletePost removes post from state', async () => {
    // Initial load with one post
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [mockPost],
      error: null,
    } as never);

    // Mock delete chain
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as never);

    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toHaveLength(1);

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.deletePost('post-1');
    });

    expect(response.error).toBeNull();
    expect(result.current.posts).toHaveLength(0);
    expect(postsCache.invalidateAll).toHaveBeenCalled();
  });

  // ── applyOptimisticReaction ─────────────────────────────────────────────

  it('applyOptimisticReaction adds a reaction count', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [mockPost],
      error: null,
    } as never);

    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Add a fire reaction (wasActive=false → adding)
    act(() => {
      result.current.applyOptimisticReaction('post-1', '🔥', 'user-1', false);
    });

    const updatedPost = result.current.posts.find((p) => p.id === 'post-1');
    expect(updatedPost?.reactions?.['🔥']).toBe(1);
    expect(updatedPost?.user_reactions).toContain('🔥');
  });

  it('applyOptimisticReaction removes a reaction count', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [mockPost],
      error: null,
    } as never);

    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Remove the heart reaction (wasActive=true → removing)
    act(() => {
      result.current.applyOptimisticReaction('post-1', '❤️', 'user-1', true);
    });

    const updatedPost = result.current.posts.find((p) => p.id === 'post-1');
    // Was 2, now 1
    expect(updatedPost?.reactions?.['❤️']).toBe(1);
    expect(updatedPost?.user_reactions).not.toContain('❤️');
  });

  // ── refetch ─────────────────────────────────────────────────────────────

  it('refetch invalidates cache and reloads', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [mockPost],
      error: null,
    } as never);

    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(postsCache.invalidateAll).toHaveBeenCalled();
    expect(result.current.posts).toHaveLength(1);
  });
});
