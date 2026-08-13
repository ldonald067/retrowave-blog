/**
 * Cursor trail mode store — localStorage-backed, broadcast via a window
 * CustomEvent so the picker (Sidebar) and renderer (CursorSparkle) stay in
 * sync. Lives outside CursorSparkle.tsx so that component file only exports
 * a component (react-refresh requirement).
 */
import { useEffect, useState } from 'react';

/**
 * Trail presets.
 *
 * `color` is empty when the glyphs supply their own — an emoji ignores `color`
 * anyway, and leaving it unset is what keeps the renderer free of per-mode
 * special cases.
 *
 * `sizeScale` exists because emoji need more pixels than line glyphs to read as
 * anything: a 🌈 at the 8px floor that suits `✦` is an indistinct smudge.
 */
export const TRAIL_MODES = {
  sparkle: {
    chars: ['✦', '✧', '⋆', '✶', '✷', '·', '✸'],
    color: 'var(--accent-primary)',
    sizeScale: 1,
  },
  hearts: {
    chars: ['♡', '♥', '❤', '💕', '❥', '♡', '❣'],
    color: 'var(--accent-secondary)',
    sizeScale: 1,
  },
  // Actual rainbows. This used to be the sparkle glyphs tinted through a
  // hardcoded seven-colour cycle, which broke the promise the picker makes
  // (every other mode trails the glyph on its own button) and quietly failed on
  // the light themes: that palette's yellow sits at 1.03:1 on classic-xanga's
  // background and its green at 1.98:1, so most of the "rainbow" was invisible
  // on the default theme. An emoji brings its own colours and cannot wash out.
  rainbow: {
    chars: ['🌈'],
    color: '',
    sizeScale: 1.75,
  },
} as const;

export type TrailMode = keyof typeof TRAIL_MODES;

const TRAIL_KEY = 'cursor-trail-mode';

export function getTrailMode(): TrailMode {
  try {
    const stored = localStorage.getItem(TRAIL_KEY);
    if (stored && stored in TRAIL_MODES) return stored as TrailMode;
  } catch {
    /* private browsing */
  }
  return 'sparkle';
}

export function setTrailMode(mode: TrailMode): void {
  try {
    localStorage.setItem(TRAIL_KEY, mode);
  } catch {
    /* private browsing */
  }
  window.dispatchEvent(new CustomEvent('cursor-trail-change', { detail: mode }));
}

export function useTrailMode(): [TrailMode, (mode: TrailMode) => void] {
  const [mode, setMode] = useState<TrailMode>(getTrailMode);

  useEffect(() => {
    const handler = (e: Event) => setMode((e as CustomEvent<TrailMode>).detail);
    window.addEventListener('cursor-trail-change', handler);
    return () => window.removeEventListener('cursor-trail-change', handler);
  }, []);

  return [mode, setTrailMode];
}

export const TRAIL_MODE_OPTIONS: { id: TrailMode; label: string; icon: string }[] = [
  { id: 'sparkle', label: '✦ sparkles', icon: '✦' },
  { id: 'hearts', label: '♡ hearts', icon: '♡' },
  { id: 'rainbow', label: '🌈 rainbow', icon: '🌈' },
];
