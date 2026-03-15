import { useEffect, useRef, useState } from 'react';

const TRAIL_MODES = {
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

type TrailMode = keyof typeof TRAIL_MODES;

const RAINBOW_COLORS = [
  '#ff0000', '#ff8800', '#ffff00', '#00cc00', '#0088ff', '#8800ff', '#ff00ff',
];

const TRAIL_KEY = 'cursor-trail-mode';
const MAX_SPARKLES = 20;
const SPAWN_INTERVAL = 50;

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

export default function CursorSparkle() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sparkleCount = useRef(0);
  const lastSpawn = useRef(0);
  const rainbowIndex = useRef(0);
  const modeRef = useRef<TrailMode>(getTrailMode());

  useEffect(() => {
    const handler = (e: Event) => {
      modeRef.current = (e as CustomEvent<TrailMode>).detail;
    };
    window.addEventListener('cursor-trail-change', handler);
    return () => window.removeEventListener('cursor-trail-change', handler);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hasFineMouse = window.matchMedia('(pointer: fine)').matches;
    if (!hasFineMouse) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSpawn.current < SPAWN_INTERVAL) return;
      if (sparkleCount.current >= MAX_SPARKLES) return;
      lastSpawn.current = now;

      const mode = modeRef.current;
      const config = TRAIL_MODES[mode];

      const sparkle = document.createElement('span');
      sparkle.className = 'cursor-sparkle';
      sparkle.textContent = config.chars[Math.floor(Math.random() * config.chars.length)] ?? '✦';

      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      sparkle.style.left = `${e.clientX + offsetX}px`;
      sparkle.style.top = `${e.clientY + offsetY}px`;

      const size = 8 + Math.random() * 8;
      sparkle.style.fontSize = `${size}px`;

      if (mode === 'rainbow') {
        sparkle.style.color = RAINBOW_COLORS[rainbowIndex.current % RAINBOW_COLORS.length] ?? '#ff0000';
        rainbowIndex.current++;
      } else {
        sparkle.style.color = config.color;
      }

      container.appendChild(sparkle);
      sparkleCount.current++;

      sparkle.addEventListener('animationend', () => {
        sparkle.remove();
        sparkleCount.current--;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <div ref={containerRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} />;
}
