import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { setSession } = vi.hoisted(() => ({
  setSession: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('../supabase', () => ({
  supabase: { auth: { setSession } },
}));

// isNativePlatform is read at module load, so each platform needs its own
// import. vi.resetModules + dynamic import keeps that honest.
async function loadWith(native: boolean) {
  vi.doMock('../capacitor', () => ({ isNativePlatform: native }));
  vi.resetModules();
  return import('../auth-callback');
}

const HASH = '#access_token=tok-abc&refresh_token=ref-xyz&type=signup';

describe('consumeAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    vi.doUnmock('../capacitor');
    vi.resetModules();
  });

  it('turns a confirmation hash into a session', async () => {
    const { consumeAuthCallback } = await loadWith(true);

    await expect(consumeAuthCallback(HASH)).resolves.toBe(true);
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'tok-abc',
      refresh_token: 'ref-xyz',
    });
  });

  it('strips the spent tokens out of the URL', async () => {
    const { consumeAuthCallback } = await loadWith(true);
    window.history.replaceState(null, '', `/${HASH}`);

    await consumeAuthCallback(HASH);

    // These are credentials. Leaving them in the address bar keeps them in
    // history and in anything that logs URLs.
    expect(window.location.hash).toBe('');
  });

  it('ignores an ordinary route instead of clobbering it', async () => {
    const { consumeAuthCallback } = await loadWith(true);

    // #/u/name and #/report/<id> are real routes. Treating any hash as a
    // callback would wipe them on arrival.
    await expect(consumeAuthCallback('#/u/retrodemo')).resolves.toBe(false);
    expect(setSession).not.toHaveBeenCalled();
  });

  it('reports failure rather than a phantom session when setSession rejects it', async () => {
    const { consumeAuthCallback } = await loadWith(true);
    setSession.mockResolvedValueOnce({ error: new Error('token expired') });

    await expect(consumeAuthCallback(HASH)).resolves.toBe(false);
  });

  it('needs both tokens — an access token alone is not a session', async () => {
    const { consumeAuthCallback } = await loadWith(true);

    await expect(consumeAuthCallback('#access_token=tok-abc')).resolves.toBe(false);
    expect(setSession).not.toHaveBeenCalled();
  });
});

describe('authRedirectTo', () => {
  afterEach(() => {
    vi.doUnmock('../capacitor');
    vi.resetModules();
  });

  it('sends native signups to the deep link, not the website', async () => {
    const { authRedirectTo } = await loadWith(true);

    // The whole bug: falling back to the Site URL confirmed an iOS signup in
    // Safari, where the app's WKWebView could never see the session.
    //
    // Asserted exactly, including the absence of a path: Supabase's allow-list
    // holds the bare scheme with no wildcard, and a redirect that fails to
    // match is silently swapped for the Site URL. A "harmless" tidy-up here
    // would restore the original bug invisibly.
    expect(authRedirectTo()).toBe('com.retrowave.journal://');
  });

  it('sends web signups to the current origin so localhost still works', async () => {
    const { authRedirectTo } = await loadWith(false);

    expect(authRedirectTo()).toBe(window.location.origin);
  });
});
