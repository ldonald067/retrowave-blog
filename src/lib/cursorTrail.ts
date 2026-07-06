/**
 * Cursor trail mode store — localStorage-backed, broadcast via a window
 * CustomEvent so the picker (Sidebar) and renderer (CursorSparkle) stay in
 * sync. Lives outside CursorSparkle.tsx so that component file only exports
 * a component (react-refresh requirement).
 */
import { useEffect, useState } from 'react';

export const TRAIL_MODES = {
  sparkle: {
    chars: ['✦', '✧', '⋆', '✶', '✷', '·', '✸'],
    color: 'var(--accent-primary)',
  },
  hearts: {
    chars: ['♡', '♥', '❤', '💕', '❥', '♡', '❣'],
    color: 'var(--accent-secondary)',
  },
  rainbow: {
    chars: ['✦', '⋆', '✧', '★', '·', '✶', '✸'],
    // Color cycles via index — handled in mousemove
    color: '',
  },
} as const;

export type TrailMode = keyof typeof TRAIL_MODES;

const TRAIL_KEY = 'cursor-trail-mode';

export function getTrailMode(): TrailMode {
  try {
    const stored = localStorage.getItem(TRAIL_KEY);
    if (stored && stored in TRAIL_MODES) return stored as TrailMode;
  } catch { /* private browsing */ }
  return 'sparkle';
}

export function setTrailMode(mode: TrailMode): void {
  try { localStorage.setItem(TRAIL_KEY, mode); } catch { /* private browsing */ }
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
