/**
 * Capacitor plugin integrations.
 *
 * All native-only calls are guarded by `Capacitor.isNativePlatform()` so the
 * web build is never affected.  Plugins that already provide web fallbacks
 * (Share, Browser, Haptics) are called unconditionally.
 */
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';

const isNative = Capacitor.isNativePlatform();

// ---------------------------------------------------------------------------
// Boot-time initialization
// ---------------------------------------------------------------------------

/**
 * Set up native-only listeners. Call once from main.tsx.
 *
 * - Deep link listener for magic-link auth redirects
 */
export function initCapacitor(): void {
  if (!isNative) return;

  // Deep links: Supabase magic link redirects arrive here on iOS.
  // The URL contains auth tokens in the hash fragment — setting
  // window.location.hash lets the Supabase SDK pick them up via
  // onAuthStateChange.
  CapApp.addListener('appUrlOpen', ({ url }) => {
    const hashIndex = url.indexOf('#');
    if (hashIndex >= 0) {
      window.location.hash = url.substring(hashIndex);
    }
  });
}

// ---------------------------------------------------------------------------
// Splash screen
// ---------------------------------------------------------------------------

/** Hide the native splash screen. Call after auth session resolves. */
export async function hideSplashScreen(): Promise<void> {
  if (!isNative) return;
  await SplashScreen.hide({ fadeOutDuration: 300 });
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

const DARK_THEMES = new Set([
  'emo-dark',
  'scene-kid',
  'myspace-blue',
  'y2k-cyber',
  'grunge',
  'pastel-goth',
]);

/**
 * Update the iOS status bar to match the current theme.
 * Dark backgrounds → light (white) text.  Light backgrounds → dark text.
 */
export async function setStatusBarForTheme(themeId: string): Promise<void> {
  if (!isNative) return;
  const isDark = DARK_THEMES.has(themeId);
  // Style.Dark = light text on dark bg, Style.Light = dark text on light bg
  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
}

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

/** Light haptic tap — used on reaction toggle. */
export async function hapticImpact(): Promise<void> {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Silently swallow — device may not support haptics
  }
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------

/** Share a post via the native share sheet (falls back to Web Share API). */
export async function sharePost(
  title: string,
  text: string,
): Promise<void> {
  try {
    await Share.share({
      title,
      text,
      dialogTitle: '~ share this entry ~',
    });
  } catch {
    // User cancelled or share not available
  }
}

// ---------------------------------------------------------------------------
// In-app browser
// ---------------------------------------------------------------------------

/**
 * Open a URL in SFSafariViewController (iOS) or the system browser.
 * Falls back to `window.open` on web.
 */
export async function openUrl(url: string): Promise<void> {
  if (isNative) {
    await Browser.open({ url, presentationStyle: 'popover' });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
