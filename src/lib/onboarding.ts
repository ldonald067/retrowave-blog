import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const SEEN_KEY = 'onboarding-seen-v1';

/**
 * Whether the intro has already been shown.
 *
 * Stored in `Preferences` (`UserDefaults`) on native rather than
 * `localStorage`, which iOS reclaims under disk pressure — the same eviction
 * that caused the silent sign-out. An evicted flag would only replay the intro
 * at someone who has already seen it, which is embarrassing rather than
 * harmful, but the durable store is free now that `auth-storage.ts` has
 * established it.
 *
 * `UserDefaults` is cleared when the app is deleted and recreated on reinstall,
 * which is exactly the intended lifetime: once per install, not once per
 * launch. It also rides along in an iOS backup, so restoring to a new phone
 * does not replay the intro at the same person.
 *
 * Versioned key, so a future rewrite of the intro can show itself again by
 * bumping the suffix rather than by clearing something users cannot see.
 */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: SEEN_KEY });
      return value === 'true';
    }
    return localStorage.getItem(SEEN_KEY) === 'true';
  } catch {
    // Storage unavailable: treat as seen. Showing the intro to a returning user
    // on every launch is worse than never showing it to a new one.
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: SEEN_KEY, value: 'true' });
      return;
    }
    localStorage.setItem(SEEN_KEY, 'true');
  } catch {
    // Non-fatal; the worst case is the intro showing once more.
  }
}
