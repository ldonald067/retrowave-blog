import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const store = new Map<string, string>();
const nativeState = { isNative: false };
const shouldThrow = { get: false, set: false };

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativeState.isNative },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => {
      if (shouldThrow.get) throw new Error('storage unavailable');
      return { value: store.get(key) ?? null };
    }),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      if (shouldThrow.set) throw new Error('storage unavailable');
      store.set(key, value);
    }),
  },
}));

const load = async () => import('../onboarding');

beforeEach(() => {
  store.clear();
  localStorage.clear();
  shouldThrow.get = false;
  shouldThrow.set = false;
  nativeState.isNative = false;
});

afterEach(() => {
  nativeState.isNative = false;
});

describe('onboarding seen flag', () => {
  it('is unseen on a fresh install', async () => {
    const { hasSeenOnboarding } = await load();
    expect(await hasSeenOnboarding()).toBe(false);
  });

  it('persists once marked, on web', async () => {
    const { hasSeenOnboarding, markOnboardingSeen } = await load();
    await markOnboardingSeen();
    expect(await hasSeenOnboarding()).toBe(true);
  });

  it('uses the durable store on native, not localStorage', async () => {
    // localStorage is the store iOS evicts — the same one that caused the
    // silent sign-out. The flag must not live there on device.
    nativeState.isNative = true;
    const { hasSeenOnboarding, markOnboardingSeen } = await load();

    await markOnboardingSeen();

    expect(store.get('onboarding-seen-v1')).toBe('true');
    expect(localStorage.getItem('onboarding-seen-v1')).toBeNull();
    expect(await hasSeenOnboarding()).toBe(true);
  });

  it('does not read a web flag on native, or vice versa', async () => {
    localStorage.setItem('onboarding-seen-v1', 'true');
    nativeState.isNative = true;
    const { hasSeenOnboarding } = await load();

    expect(await hasSeenOnboarding()).toBe(false);
  });

  it('treats unreadable storage as seen, so the intro cannot loop', async () => {
    // Showing the intro to a returning user on every launch is worse than
    // never showing it to a new one.
    nativeState.isNative = true;
    shouldThrow.get = true;
    const { hasSeenOnboarding } = await load();

    expect(await hasSeenOnboarding()).toBe(true);
  });

  it('does not throw when the flag cannot be written', async () => {
    nativeState.isNative = true;
    shouldThrow.set = true;
    const { markOnboardingSeen } = await load();

    await expect(markOnboardingSeen()).resolves.toBeUndefined();
  });
});
