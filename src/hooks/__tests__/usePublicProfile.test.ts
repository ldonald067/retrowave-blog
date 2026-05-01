import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('../../lib/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { usePublicProfile } from '../usePublicProfile';
import { supabase } from '../../lib/supabase';

const mockPublicProfile = {
  profile: {
    username: 'jane',
    display_name: 'Jane',
    bio: 'hello',
    avatar_url: null,
    theme: null,
    current_mood: null,
    current_music: null,
    status_message: 'away writing again',
    created_at: '2026-04-17T00:00:00Z',
  },
  posts: [],
};

describe('usePublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a public profile successfully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockPublicProfile,
      error: null,
    } as never);

    const { result } = renderHook(() => usePublicProfile('jane'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabase.rpc).toHaveBeenCalledWith('get_public_profile', { p_username: 'jane' });
    expect(result.current.notFound).toBe(false);
    expect(result.current.data?.profile.username).toBe('jane');
  });

  it('marks the profile as not found when the RPC returns no result', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: null,
    } as never);

    const { result } = renderHook(() => usePublicProfile('missing'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.notFound).toBe(true);
  });

  it('clears loading and marks notFound when the RPC throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('network failed'));

    try {
      const { result } = renderHook(() => usePublicProfile('jane'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toBeNull();
      expect(result.current.notFound).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        '[usePublicProfile] fetch failed:',
        expect.any(Error)
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
