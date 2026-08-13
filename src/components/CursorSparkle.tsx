import { useEffect, useRef } from 'react';
import { TRAIL_MODES, getTrailMode, type TrailMode } from '../lib/cursorTrail';
import { prefersReducedMotion } from '../lib/motion';

const MAX_SPARKLES = 20;
const SPAWN_INTERVAL = 50;

export default function CursorSparkle() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sparkleCount = useRef(0);
  const lastSpawn = useRef(0);
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

    if (prefersReducedMotion()) return;
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

      const size = (8 + Math.random() * 8) * config.sizeScale;
      sparkle.style.fontSize = `${size}px`;

      // Only tint glyphs that need tinting. Emoji carry their own colours, and
      // setting `color` on one does nothing — so an empty `color` in the preset
      // is the whole of the former rainbow special case.
      if (config.color) sparkle.style.color = config.color;

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

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}
