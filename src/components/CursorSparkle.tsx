import { useEffect, useRef } from 'react';

const SPARKLE_CHARS = ['✦', '✧', '⋆', '✶', '✷', '·', '✸'];
const MAX_SPARKLES = 20;
const SPAWN_INTERVAL = 50; // ms

export default function CursorSparkle() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sparkleCount = useRef(0);
  const lastSpawn = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Skip on touch-only devices — sparkles follow mouse cursor, not finger
    const hasFineMouse = window.matchMedia('(pointer: fine)').matches;
    if (!hasFineMouse) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSpawn.current < SPAWN_INTERVAL) return;
      if (sparkleCount.current >= MAX_SPARKLES) return;
      lastSpawn.current = now;

      const sparkle = document.createElement('span');
      sparkle.className = 'cursor-sparkle';
      sparkle.textContent = SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)] ?? '✦';

      // Random offset from cursor
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      sparkle.style.left = `${e.clientX + offsetX}px`;
      sparkle.style.top = `${e.clientY + offsetY}px`;

      // Random size
      const size = 8 + Math.random() * 8;
      sparkle.style.fontSize = `${size}px`;

      // Use theme color
      sparkle.style.color = 'var(--accent-primary)';

      container.appendChild(sparkle);
      sparkleCount.current++;

      // Remove after animation
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
