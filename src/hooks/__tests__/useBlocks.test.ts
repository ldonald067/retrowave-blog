import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock supabase — all variables must be inside the factory to avoid hoisting issues
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

// Mock withRetry to pass through the async fn
vi.mock('../../lib/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { useBlocks } from '../useBlocks';
import { supabase } from '../../lib/supabase';

describe('useBlocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── toggleBlock ─────────────────────────────────────────────────────────

  it('toggleBlock calls supabase RPC with correct args', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { is_blocked: true },
      error: null,
    } as never);

    const { result } = renderHook(() => useBlocks());

    let response: { is_blocked: boolean; error: string | null } = { is_blocked: false, error: null };
    await act(async () => {
      response = await result.current.toggleBlock('user-123');
    });

    expect(supabase.rpc).toHaveBeenCalledWith('toggle_user_block', {
      p_target_user_id: 'user-123',
    });
    expect(response.is_blocked).toBe(true);
    expect(response.error).toBeNull();
  });

  it('toggleBlock returns is_blocked false when unblocking', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { is_blocked: false },
      error: null,
    } as never);

    const { result } = renderHook(() => useBlocks());

    let response: { is_blocked: boolean; error: string | null } = { is_blocked: true, error: null };
    await act(async () => {
      response = await result.current.toggleBlock('user-456');
    });

    expect(response.is_blocked).toBe(false);
    expect(response.error).toBeNull();
  });

  it('toggleBlock returns error on RPC failure', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC failed', code: '500' },
    } as never);

    const { result } = renderHook(() => useBlocks());

    let response: { is_blocked: boolean; error: string | null } = { is_blocked: false, error: null };
    await act(async () => {
      response = await result.current.toggleBlock('user-789');
    });

    expect(response.is_blocked).toBe(false);
    expect(response.error).toBe('Something went wrong. Please try again.');
  });

  // ── fetchBlockedUsers ──────────────────────────────────────────────────

  it('fetchBlockedUsers returns data from supabase query', async () => {
    const blockedUsers = [
      { blocked_id: 'user-a', created_at: '2025-01-01T00:00:00Z' },
      { blocked_id: 'user-b', created_at: '2025-01-02T00:00:00Z' },
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: blockedUsers, error: null });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    vi.mocked(supabase.from).mockReturnValueOnce({ select: selectMock } as never);

    const { result } = renderHook(() => useBlocks());

    let response: { data: unknown[]; error: string | null } = { data: [], error: null };
    await act(async () => {
      response = await result.current.fetchBlockedUsers();
    });

    expect(supabase.from).toHaveBeenCalledWith('user_blocks');
    expect(response.data).toHaveLength(2);
    expect(response.data[0]).toMatchObject({ blocked_id: 'user-a' });
    expect(response.error).toBeNull();
  });

  it('fetchBlockedUsers returns error on query failure', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Query failed', code: '500' },
    });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    vi.mocked(supabase.from).mockReturnValueOnce({ select: selectMock } as never);

    const { result } = renderHook(() => useBlocks());

    let response: { data: unknown[]; error: string | null } = { data: [], error: null };
    await act(async () => {
      response = await result.current.fetchBlockedUsers();
    });

    expect(response.data).toHaveLength(0);
    expect(response.error).toBe('Something went wrong. Please try again.');
  });
});
