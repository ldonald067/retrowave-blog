import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * `authStorage` is decided at module load from `Capacitor.isNativePlatform()`,
 * so each case has to re-import the module under a fresh mock rather than
 * toggling a flag.
 */
const store = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      store.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      store.delete(key);
    }),
  },
}));

async function loadStorage(isNative: boolean) {
  vi.resetModules();
  vi.doMock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: () => isNative },
  }));
  return (await import('../auth-storage')).authStorage;
}

const KEY = 'sb-projectref-auth-token';

beforeEach(() => {
  store.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.doUnmock('@capacitor/core');
});

describe('authStorage', () => {
  it('is undefined on web, leaving supabase-js on its localStorage default', async () => {
    expect(await loadStorage(false)).toBeUndefined();
  });

  it('reads and writes through Preferences on native', async () => {
    const s = (await loadStorage(true))!;
    await s.setItem(KEY, 'session-value');
    expect(await s.getItem(KEY)).toBe('session-value');
    // Written to the durable store, not the evictable one.
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('returns null when neither store has the key', async () => {
    const s = (await loadStorage(true))!;
    expect(await s.getItem(KEY)).toBeNull();
  });

  it('migrates an existing localStorage session on first read', async () => {
    // The upgrade case: the user is already signed in, and their session is in
    // the old store. Missing this signs everyone out once on update — the exact
    // failure this module exists to prevent.
    localStorage.setItem(KEY, 'legacy-session');
    const s = (await loadStorage(true))!;

    expect(await s.getItem(KEY)).toBe('legacy-session');
    // and is now durable, so a later eviction of web storage cannot lose it
    expect(store.get(KEY)).toBe('legacy-session');
  });

  it('prefers the durable copy over a stale legacy one', async () => {
    localStorage.setItem(KEY, 'stale');
    store.set(KEY, 'current');
    const s = (await loadStorage(true))!;
    expect(await s.getItem(KEY)).toBe('current');
  });

  it('treats an empty durable value as absent rather than a session', async () => {
    // Found on device, not here: supabase-js clears a session by writing "",
    // not by calling removeItem. Reading that back as present handed "" to a
    // JSON.parse and shadowed the migration below it forever.
    store.set(KEY, '');
    localStorage.setItem(KEY, 'legacy-session');
    const s = (await loadStorage(true))!;

    expect(await s.getItem(KEY)).toBe('legacy-session');
  });

  it('treats an empty write as a clear, in both stores', async () => {
    localStorage.setItem(KEY, 'legacy-session');
    store.set(KEY, 'session-value');
    const s = (await loadStorage(true))!;

    await s.setItem(KEY, '');

    expect(store.has(KEY)).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
    // and cannot be resurrected from the legacy copy on the next read
    expect(await s.getItem(KEY)).toBeNull();
  });

  it('drops the legacy copy once a real session is written', async () => {
    localStorage.setItem(KEY, 'legacy-session');
    const s = (await loadStorage(true))!;

    await s.setItem(KEY, 'fresh-session');

    expect(store.get(KEY)).toBe('fresh-session');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('clears both stores on removal, so sign out cannot leave a resurrectable copy', async () => {
    localStorage.setItem(KEY, 'legacy-session');
    store.set(KEY, 'session-value');
    const s = (await loadStorage(true))!;

    await s.removeItem(KEY);

    expect(store.has(KEY)).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(await s.getItem(KEY)).toBeNull();
  });
});
