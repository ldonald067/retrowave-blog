import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock auth-guard
vi.mock('../../lib/auth-guard', () => ({
  requireAuth: vi.fn(),
}));

// Mock haptic (no-op in tests)
vi.mock('../../lib/capacitor', () => ({
  hapticImpact: vi.fn().mockResolvedValue(undefined),
}));

import { useReactions } from '../useReactions';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth-guard';

const mockUser = { id: 'user-1', email: 'test@example.com' };

// Helper to set up supabase.from() chain for insert or delete
function mockInsertChain(error: unknown = null) {
  const insertMock = vi.fn().mockResolvedValue({ error });
  vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never);
  return insertMock;
}

function mockDeleteChain(error: unknown = null) {
  const eqReactionType = vi.fn().mockResolvedValue({ error });
  const eqUserId = vi.fn().mockReturnValue({ eq: eqReactionType });
  const eqPostId = vi.fn().mockReturnValue({ eq: eqUserId });
  const deleteMock = vi.fn().mockReturnValue({ eq: eqPostId });
  vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as never);
  return deleteMock;
}

describe('useReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, error: null } as never);
  });

  it('inserts a new reaction when emoji is not active', async () => {
    const insertMock = mockInsertChain();

    const { result } = renderHook(() => useReactions());

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.toggleReaction('post-1', '❤️', []);
    });

    expect(supabase.from).toHaveBeenCalledWith('post_reactions');
    expect(insertMock).toHaveBeenCalledWith({
      post_id: 'post-1',
      user_id: 'user-1',
      reaction_type: '❤️',
    });
    expect(response.error).toBeNull();
  });

  it('deletes an existing reaction when emoji is active', async () => {
    mockDeleteChain();

    const { result } = renderHook(() => useReactions());

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.toggleReaction('post-1', '🔥', ['🔥']);
    });

    expect(supabase.from).toHaveBeenCalledWith('post_reactions');
    expect(response.error).toBeNull();
  });

  it('calls onOptimisticUpdate before server round-trip', async () => {
    mockInsertChain();
    const onOptimisticUpdate = vi.fn();

    const { result } = renderHook(() => useReactions({ onOptimisticUpdate }));

    await act(async () => {
      await result.current.toggleReaction('post-1', '✨', []);
    });

    expect(onOptimisticUpdate).toHaveBeenCalledWith('post-1', '✨', 'user-1', false);
  });

  it('rolls back optimistic update on server error', async () => {
    mockInsertChain({ message: 'insert failed', code: '500' });
    const onOptimisticUpdate = vi.fn();

    const { result } = renderHook(() => useReactions({ onOptimisticUpdate }));

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.toggleReaction('post-1', '😂', []);
    });

    // First call: optimistic (wasActive=false)
    expect(onOptimisticUpdate).toHaveBeenCalledWith('post-1', '😂', 'user-1', false);
    // Second call: rollback (wasActive flipped to true)
    expect(onOptimisticUpdate).toHaveBeenCalledWith('post-1', '😂', 'user-1', true);
    expect(response.error).toBeTruthy();
  });

  it('returns auth error when not logged in', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      user: null,
      error: 'You must be logged in to do that.',
    } as never);

    const { result } = renderHook(() => useReactions());

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.toggleReaction('post-1', '❤️', []);
    });

    expect(response.error).toBe('You must be logged in to do that.');
    // Should not have called supabase
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('cooldown prevents rapid double-taps within 400ms window', async () => {
    // First insert resolves immediately
    mockInsertChain();

    const { result } = renderHook(() => useReactions());

    // First call completes normally
    await act(async () => {
      await result.current.toggleReaction('post-1', '❤️', []);
    });

    // Second call immediately after — within the 400ms cooldown window
    // Reset the from mock so we can track if it's called again
    vi.mocked(supabase.from).mockClear();

    let secondResponse: { error: string | null } = { error: 'not set' };
    await act(async () => {
      secondResponse = await result.current.toggleReaction('post-1', '❤️', []);
    });

    // Should be silently ignored by cooldown guard (returns null error)
    expect(secondResponse.error).toBeNull();
    // Supabase should NOT have been called for the second request
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
