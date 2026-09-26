import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Profile } from '../../types/profile';

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

vi.mock('../../lib/auth-guard', () => ({
  requireAuth: vi.fn(),
}));

import { useAuth } from '../useAuth';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth-guard';

const mockUser = { id: 'user-1', email: 'test@example.com' };

const savedProfile: Profile = {
  id: 'user-1',
  username: 'testuser',
  display_name: 'New Name',
  bio: null,
  avatar_url: null,
  birth_year: 2000,
  age_verified: true,
  tos_accepted: true,
  theme: 'default',
  current_mood: null,
  current_music: null,
  status_message: null,
  is_admin: false,
  is_public: false,
  private_chapters: [],
  username_changed_at: null,
  created_at: '2026-04-17T00:00:00Z',
  updated_at: '2026-04-17T00:00:00Z',
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);
    vi.mocked(requireAuth).mockResolvedValue({
      user: null,
      error: 'You must be logged in to do that.',
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

    // emailRedirectTo is required, not incidental: without it the link falls
    // back to the project's Site URL, which is what confirmed iOS signups in
    // Safari where the app could never see the session. jsdom's origin stands
    // in for the web branch of authRedirectTo here.
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
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

    expect(response.error).toBe('Something went wrong. Please try again.');
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
        emailRedirectTo: window.location.origin,
        data: {
          birth_year: 2000,
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

    expect(response.error).toBe('You must be logged in to do that.');
  });

  it('updateProfile uses the saved row immediately', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      user: mockUser,
      error: null,
    } as never);

    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: savedProfile, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValueOnce(query as never);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } = { error: null };
    await act(async () => {
      response = await result.current.updateProfile({ display_name: 'New Name' });
    });

    expect(response.error).toBeNull();
    expect(query.update).toHaveBeenCalledWith({ display_name: 'New Name' });
    expect(query.eq).toHaveBeenCalledWith('id', mockUser.id);
    expect(query.select).toHaveBeenCalled();
    expect(result.current.profile).toEqual(savedProfile);
    expect(result.current.profileError).toBeNull();
  });

  it('refetchProfile bypasses the cooldown for the current user', async () => {
    const initialProfile: Profile = { ...savedProfile, display_name: 'Old Name' };
    const updatedProfile: Profile = { ...savedProfile, display_name: 'Updated Name' };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: mockUser } },
    } as never);

    let nextProfile = initialProfile;
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => Promise.resolve({ data: nextProfile, error: null })),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.profile?.display_name).toBe('Old Name');
    });

    nextProfile = updatedProfile;

    await act(async () => {
      await result.current.refetchProfile();
    });

    expect(query.single).toHaveBeenCalledTimes(2);
    expect(result.current.profile?.display_name).toBe('Updated Name');
  });
});

describe('session expiry reporting', () => {
  type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;

  const captureAuthCallback = () => {
    let callback: AuthCallback | null = null;
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      callback = cb as unknown as AuthCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });
    return () => callback!;
  };

  it('shows one message for one expiry, however many signals announce it', async () => {
    const { AUTH_SESSION_EXPIRED } = await import('../../lib/constants');
    const auth = captureAuthCallback();
    const { result } = renderHook(() => useAuth());

    // The resume check notices first; App shows the message and clears it.
    act(() => {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED));
    });
    expect(result.current.sessionExpired).toBe(true);
    act(() => result.current.clearSessionExpired());

    // Then the client's own SIGNED_OUT (twice, as it can) for the same expiry.
    act(() => {
      auth()('SIGNED_OUT', null);
      auth()('SIGNED_OUT', null);
    });
    expect(result.current.sessionExpired).toBe(false);
  });

  it('reports again after a real sign-in starts a new session', async () => {
    const auth = captureAuthCallback();
    const { result } = renderHook(() => useAuth());

    act(() => auth()('SIGNED_OUT', null));
    expect(result.current.sessionExpired).toBe(true);
    act(() => result.current.clearSessionExpired());

    act(() => auth()('SIGNED_IN', { user: { id: 'user-1' } }));
    act(() => auth()('SIGNED_OUT', null));
    expect(result.current.sessionExpired).toBe(true);
  });
});
