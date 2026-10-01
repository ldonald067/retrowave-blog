import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { AUTH_SESSION_EXPIRED } from '../constants';

// The resume check in initCapacitor: on returning to the foreground it asks
// supabase-js for the session, and a failure used to mean "ur session expired"
// whatever the cause (finding 82).

const { getSession, listeners, stub } = vi.hoisted(() => ({
  getSession: vi.fn(),
  listeners: new Map<string, (state: { isActive: boolean }) => void>(),
  // Native, with every plugin a stub: only CapApp's listeners matter here.
  stub: () => new Proxy({}, { get: () => vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('../supabase', () => ({ supabase: { auth: { getSession } } }));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (name: string, fn: (state: { isActive: boolean }) => void) => {
      listeners.set(name, fn);
      return { remove: vi.fn() };
    }),
    getLaunchUrl: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@capacitor/status-bar', () => ({ StatusBar: stub(), Style: {} }));
vi.mock('@capacitor/haptics', () => ({ Haptics: stub(), ImpactStyle: {} }));
vi.mock('@capacitor/browser', () => ({ Browser: stub() }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: stub() }));
vi.mock('@capacitor/keyboard', () => ({ Keyboard: stub(), KeyboardResize: {} }));
vi.mock('@capacitor/filesystem', () => ({ Filesystem: stub(), Directory: {}, Encoding: {} }));
vi.mock('@capacitor/share', () => ({ Share: stub() }));

import { initCapacitor } from '../capacitor';

describe('resume check', () => {
  const expired = vi.fn();

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.addEventListener(AUTH_SESSION_EXPIRED, expired);
    initCapacitor();
    await vi.waitFor(() => expect(listeners.has('appStateChange')).toBe(true));
  });

  afterEach(() => {
    window.removeEventListener(AUTH_SESSION_EXPIRED, expired);
    vi.restoreAllMocks();
    expired.mockClear();
    listeners.clear();
  });

  const resumeWith = async (error: Error) => {
    getSession.mockResolvedValueOnce({ data: { session: null }, error });
    listeners.get('appStateChange')!({ isActive: true });
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
  };

  it('says nothing when the refresh failed for want of a connection', async () => {
    // What supabase-js returns offline — and it keeps the session to retry.
    await resumeWith(new AuthRetryableFetchError('Failed to fetch', 0));
    expect(expired).not.toHaveBeenCalled();
  });

  it('still reports a refresh the server refused', async () => {
    await resumeWith(
      new AuthApiError(
        'Invalid Refresh Token: Refresh Token Not Found',
        400,
        'refresh_token_not_found'
      )
    );
    expect(expired).toHaveBeenCalledOnce();
  });
});
