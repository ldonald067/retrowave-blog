import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const isNative = Capacitor.isNativePlatform();

export const isNativePlatform = isNative;

/**
 * Saves a text file so the user actually ends up with it.
 *
 * On the web an `<a download>` click is fine. Inside the Capacitor WKWebView it
 * is a silent no-op — the anchor does nothing, no file is written, and no picker
 * appears. The export button used to do exactly that and still report success,
 * so on iOS it claimed to have exported data while producing nothing.
 *
 * On native we write to the app's Cache directory and hand the file to the iOS
 * share sheet, which is what lets the user put it in Files, Mail, or anywhere
 * else. Throws on failure so callers never report a success that did not happen.
 */
export async function saveTextFile(
  filename: string,
  contents: string,
  mimeType = 'application/json'
): Promise<boolean> {
  if (!isNative) {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  // Cache, not Documents: this is a hand-off file, not something the app owns.
  const written = await Filesystem.writeFile({
    path: filename,
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  try {
    await Share.share({ title: filename, files: [written.uri] });
    return true;
  } catch (err) {
    // Dismissing the share sheet rejects. That is not a failure — reporting an
    // error for it would be as misleading as the old silent-success bug.
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel/i.test(message)) return false;
    throw err;
  } finally {
    // The export contains every private entry in plaintext. Once the share sheet
    // has closed — completed, cancelled or failed — that copy must not sit in
    // the app cache waiting for iOS to decide to purge it.
    try {
      await Filesystem.deleteFile({ path: filename, directory: Directory.Cache });
    } catch {
      // Best effort. A failed cleanup must not mask the share result.
    }
  }
}

async function nativeOnly(action: () => Promise<void> | void): Promise<void> {
  if (!isNative) return;
  try {
    await action();
  } catch {
    // Native plugin calls can fail in previews/simulators; the web app still works.
  }
}

/**
 * Same as nativeOnly, but says so when it fails.
 *
 * Silence is correct for optional flourishes — a haptic that does not fire is
 * not worth a log line. It is wrong for anything the layout depends on. The
 * keyboard listeners are the case that matters: if they do not register,
 * `--keyboard-inset` stays at 0px and the composer sits behind the keyboard,
 * which is indistinguishable from a CSS bug and sent a previous investigation
 * looking in the wrong file entirely.
 */
async function requiredNative(label: string, action: () => Promise<void>): Promise<void> {
  if (!isNative) return;
  try {
    await action();
  } catch (err) {
    console.error(`capacitor: ${label} failed to initialise —`, err);
  }
}

function setKeyboardInset(height = 0): void {
  document.documentElement.style.setProperty('--keyboard-inset', `${height}px`);
  document.body.classList.toggle('keyboard-open', height > 0);
}

export function initCapacitor(): void {
  if (!isNative) return;

  void nativeOnly(async () => {
    await StatusBar.setOverlaysWebView({ overlay: true });
  });

  // One nativeOnly per call, deliberately. These all shared a single block, and
  // because nativeOnly swallows rejections, a failing setResizeMode silently
  // skipped every addListener after it: `--keyboard-inset` stayed 0px and the
  // composer sat behind the keyboard with nothing logged anywhere. The listeners
  // are the load-bearing part and must not depend on the setup calls, or on each
  // other — registering willShow without willHide would strand the inset open.
  void nativeOnly(async () => {
    await Keyboard.setResizeMode({ mode: KeyboardResize.None });
  });

  void nativeOnly(async () => {
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  });

  void requiredNative('keyboardWillShow', async () => {
    await Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
      setKeyboardInset(keyboardHeight);
      window.setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 60);
    });
  });

  void requiredNative('keyboardWillHide', async () => {
    await Keyboard.addListener('keyboardWillHide', () => setKeyboardInset(0));
  });

  void requiredNative('keyboardDidHide', async () => {
    await Keyboard.addListener('keyboardDidHide', () => setKeyboardInset(0));
  });

  /**
   * Route a deep link's fragment into the app.
   *
   * iOS normalises `com.retrowave.journal://#/u/name` to
   * `com.retrowave.journal:///#/u/name`, so the fragment is found by searching
   * for `#` rather than by parsing the URL structure.
   */
  const routeDeepLink = (url: string): void => {
    const hashIndex = url.indexOf('#');
    if (hashIndex < 0) return;
    const hash = url.substring(hashIndex);
    // Assigning an identical hash fires no hashchange, so nothing downstream
    // would notice a link being followed twice.
    if (window.location.hash === hash) return;
    window.location.hash = hash;
  };

  void requiredNative('appUrlOpen', async () => {
    await CapApp.addListener('appUrlOpen', ({ url }) => routeDeepLink(url));
  });

  /**
   * The cold-start case, which addListener alone cannot cover.
   *
   * Tapping a link while the app is closed launches it *with* the URL, and iOS
   * delivers that before this JavaScript exists — so the event has already been
   * and gone by the time the listener registers, and the link silently does
   * nothing. getLaunchUrl asks for it after the fact. That is the common case
   * for an emailed link: the app is usually not already open.
   */
  void requiredNative('getLaunchUrl', async () => {
    const launch = await CapApp.getLaunchUrl();
    if (launch?.url) routeDeepLink(launch.url);
  });
}

export async function hideSplashScreen(): Promise<void> {
  await nativeOnly(async () => {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  });
}

const DARK_THEMES = new Set([
  'emo-dark',
  'scene-kid',
  'myspace-blue',
  'y2k-cyber',
  'grunge',
  'pastel-goth',
]);

export async function setStatusBarForTheme(themeId: string): Promise<void> {
  await nativeOnly(async () => {
    const isDark = DARK_THEMES.has(themeId);
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  });
}

export async function hapticImpact(): Promise<void> {
  await nativeOnly(async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
  });
}

export async function openUrl(url: string): Promise<void> {
  try {
    if (isNative) {
      await Browser.open({ url, presentationStyle: 'popover' });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
