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
const hashInUrl = () => window.location.hash;

describe('consumeAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession.mockResolvedValue({ error: null });
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    vi.doUnmock('../capacitor');
    vi.resetModules();
  });

  it('turns a confirmation hash into a session', async () => {
    const { consumeAuthCallback } = await loadWith(true);

    await expect(consumeAuthCallback(HASH)).resolves.toEqual({ status: 'signed-in' });
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'tok-abc',
      refresh_token: 'ref-xyz',
    });
  });

  it('strips the spent tokens out of the URL', async () => {
    const { consumeAuthCallback } = await loadWith(true);
    window.history.replaceState(null, '', `/${HASH}`);

    await consumeAuthCallback(HASH);

    expect(hashInUrl()).toBe('');
  });

  it('strips the tokens even when the exchange FAILS', async () => {
    const { consumeAuthCallback } = await loadWith(true);
    window.history.replaceState(null, '', `/${HASH}`);
    setSession.mockResolvedValueOnce({ error: new Error('token expired') });

    const result = await consumeAuthCallback(HASH);

    // The failure path is the one where credentials linger, so it is the one
    // that matters. Cleanup used to sit after an early return and never ran here.
    expect(hashInUrl()).toBe('');
    expect(result).toEqual({ status: 'error', message: expect.stringContaining('expired') });
  });

  it('strips the tokens even when setSession throws', async () => {
    const { consumeAuthCallback } = await loadWith(true);
    window.history.replaceState(null, '', `/${HASH}`);
    setSession.mockRejectedValueOnce(new Error('network down'));

    // Previously an unhandled rejection out of a `void` call, with the tokens
    // left in the URL and nothing shown to the user.
    const result = await consumeAuthCallback(HASH);

    expect(hashInUrl()).toBe('');
    expect(result.status).toBe('error');
  });

  it('explains an expired link instead of looking like an ordinary route', async () => {
    const { consumeAuthCallback } = await loadWith(true);
    const dead = '#error=access_denied&error_code=otp_expired&error_description=Email+link+expired';
    window.history.replaceState(null, '', `/${dead}`);

    const result = await consumeAuthCallback(dead);

    // A dead link carries no tokens at all. Without recognising the error
    // params it was indistinguishable from #/u/name — which is exactly how an
    // expired link used to dump the user back on signup with no explanation.
    expect(result).toEqual({ status: 'error', message: expect.stringContaining('expired') });
    expect(hashInUrl()).toBe('');
    expect(setSession).not.toHaveBeenCalled();
  });

  it('ignores an ordinary route instead of clobbering it', async () => {
    const { consumeAuthCallback } = await loadWith(true);
    window.history.replaceState(null, '', '/#/u/retrodemo');

    await expect(consumeAuthCallback('#/u/retrodemo')).resolves.toEqual({ status: 'none' });
    // A real route must survive — clearing it would break deep links.
    expect(hashInUrl()).toBe('#/u/retrodemo');
    expect(setSession).not.toHaveBeenCalled();
  });

  it('needs both tokens — an access token alone is not a session', async () => {
    const { consumeAuthCallback } = await loadWith(true);

    await expect(consumeAuthCallback('#access_token=tok-abc')).resolves.toEqual({
      status: 'none',
    });
    expect(setSession).not.toHaveBeenCalled();
  });
});

describe('initAuthCallback', () => {
  afterEach(() => {
    vi.doUnmock('../capacitor');
    vi.resetModules();
    window.history.replaceState(null, '', '/');
  });

  it('does not run on web, where the Supabase client already owns the URL', async () => {
    const { initAuthCallback } = await loadWith(false);
    window.history.replaceState(null, '', `/${HASH}`);

    initAuthCallback();
    await Promise.resolve();

    // detectSessionInUrl consumes this during client construction. Two
    // consumers racing for one set of single-use tokens is not a fallback.
    expect(setSession).not.toHaveBeenCalled();
    expect(hashInUrl()).not.toBe('');
  });

  it('announces a failed callback so the UI can say something', async () => {
    const { initAuthCallback, AUTH_CALLBACK_ERROR } = await loadWith(true);
    setSession.mockResolvedValueOnce({ error: new Error('token expired') });
    const heard = vi.fn();
    window.addEventListener(AUTH_CALLBACK_ERROR, heard);
    window.history.replaceState(null, '', `/${HASH}`);

    initAuthCallback();
    await vi.waitFor(() => expect(heard).toHaveBeenCalled());

    window.removeEventListener(AUTH_CALLBACK_ERROR, heard);
  });
});

describe('authRedirectTo', () => {
  afterEach(() => {
    vi.doUnmock('../capacitor');
    vi.resetModules();
  });

  it('sends native signups to the deep link, not the website', async () => {
    const { authRedirectTo } = await loadWith(true);

    // Asserted exactly, including the absence of a path: Supabase's allow-list
    // holds the bare scheme with no wildcard, and separators in its glob syntax
    // are `.` and `/`, so an added path would not match. A "harmless" tidy-up
    // here sends confirmation back to the website instead of the app.
    expect(authRedirectTo()).toBe('com.retrowave.journal://');
  });

  it('sends web signups to the current origin', async () => {
    const { authRedirectTo } = await loadWith(false);

    expect(authRedirectTo()).toBe(window.location.origin);
  });
});

describe('recovery callbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession.mockResolvedValue({ error: null });
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    vi.doUnmock('../capacitor');
    vi.resetModules();
  });

  it('tells a recovery link apart from an ordinary sign-in', async () => {
    const { consumeAuthCallback } = await loadWith(true);
    const recovery = '#access_token=tok-abc&refresh_token=ref-xyz&type=recovery';

    // Same token pair as any other callback. Without reading `type` the app
    // signs the user in and drops them on the feed, having promised a new
    // password and then never asking for one.
    await expect(consumeAuthCallback(recovery)).resolves.toEqual({ status: 'recovery' });
    // The session still has to be established — it is what authorises the change.
    expect(setSession).toHaveBeenCalled();
  });

  it('announces recovery so the app can open the new-password screen', async () => {
    const { initAuthCallback, AUTH_PASSWORD_RECOVERY } = await loadWith(true);
    const heard = vi.fn();
    window.addEventListener(AUTH_PASSWORD_RECOVERY, heard);
    window.history.replaceState(null, '', '/#access_token=a&refresh_token=b&type=recovery');

    initAuthCallback();
    await vi.waitFor(() => expect(heard).toHaveBeenCalled());

    window.removeEventListener(AUTH_PASSWORD_RECOVERY, heard);
  });
});
