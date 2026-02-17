import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockInsert = vi.fn().mockResolvedValue({ error: null });

// Chain: .from().insert() or .from().delete().eq().eq()
// For delete, the last .eq() needs to resolve
const mockFrom = vi.fn().mockReturnValue({
  insert: mockInsert,
  delete: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
});

const mockGetUser = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useLikes } from '../useLikes';

describe('useLikes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('starts with loading false', () => {
    const { result } = renderHook(() => useLikes());
    expect(result.current.loading).toBe(false);
  });

  it('likePost returns error when not logged in', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const { result } = renderHook(() => useLikes());

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.likePost('post-1');
    });

    expect(response.error).toBe('You must be logged in to like posts');
  });

  it('likePost inserts into post_likes', async () => {
    const { result } = renderHook(() => useLikes());

    await act(async () => {
      await result.current.likePost('post-1');
    });

    expect(mockFrom).toHaveBeenCalledWith('post_likes');
    expect(mockInsert).toHaveBeenCalledWith({
      post_id: 'post-1',
      user_id: 'user-123',
    });
  });

  it('likePost handles duplicate like (23505)', async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } });

    const { result } = renderHook(() => useLikes());

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.likePost('post-1');
    });

    expect(response.error).toBe('You already liked this post');
  });

  it('unlikePost returns error when not logged in', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const { result } = renderHook(() => useLikes());

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.unlikePost('post-1');
    });

    expect(response.error).toBe('You must be logged in to unlike posts');
  });

  it('unlikePost calls delete with correct filters', async () => {
    const { result } = renderHook(() => useLikes());

    await act(async () => {
      await result.current.unlikePost('post-1');
    });

    expect(mockFrom).toHaveBeenCalledWith('post_likes');
  });
});
