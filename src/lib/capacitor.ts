import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

const isNative = Capacitor.isNativePlatform();

async function nativeOnly(action: () => Promise<void> | void): Promise<void> {
  if (!isNative) return;
  try {
    await action();
  } catch {
    // Native plugin calls can fail in previews/simulators; the web app still works.
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

  void nativeOnly(async () => {
    await Keyboard.setResizeMode({ mode: KeyboardResize.None });
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
    await Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
      setKeyboardInset(keyboardHeight);
      window.setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 60);
    });
    await Keyboard.addListener('keyboardWillHide', () => setKeyboardInset(0));
    await Keyboard.addListener('keyboardDidHide', () => setKeyboardInset(0));
  });

  void nativeOnly(async () => {
    await CapApp.addListener('appUrlOpen', ({ url }) => {
      const hashIndex = url.indexOf('#');
      if (hashIndex >= 0) {
        window.location.hash = url.substring(hashIndex);
      }
    });
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
