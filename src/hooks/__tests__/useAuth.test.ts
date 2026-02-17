import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock supabase — all variables must be inside the factory to avoid hoisting issues
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

import { useAuth } from '../useAuth';
import { supabase } from '../../lib/supabase';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);
  });

  it('starts in loading state then resolves', async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('signIn calls supabase signInWithOtp with shouldCreateUser false', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn('test@example.com');
    });

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { shouldCreateUser: false },
    });
  });

  it('signIn returns error message on failure', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
      error: new Error('Invalid email'),
    } as never);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.signIn('bad@email');
    });

    expect(response.error).toBe('Invalid email');
  });

  it('signUp passes birth year and TOS data', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signUp('user@example.com', 2000, true);
    });

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        shouldCreateUser: true,
        data: {
          birth_year: 2000,
          age_verified: true,
          tos_accepted: true,
        },
      },
    });
  });

  it('signOut calls supabase auth signOut', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('updateProfile returns error when not logged in', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.updateProfile({ display_name: 'Test' });
    });

    expect(response.error).toBe('You must be logged in to update your profile');
  });
});
