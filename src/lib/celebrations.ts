/**
 * Celebration Effects — 2005 web nostalgia
 *
 * Sparkle Burst: radiating glitter particles from a point (like GIF sparkle overlays)
 * Emoji Rain: emoji falling from the top of the screen (like MySpace snowflake scripts)
 */

const SPARKLE_CHARS = ['✦', '✧', '⋆', '✶', '✷', '✸', '·'];

// Respect reduced motion globally
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Sparkle Burst — radiates sparkle characters outward from a point.
 * Reuses the same character set as CursorSparkle for consistency.
 */
export function sparkleBurst(
  originX?: number,
  originY?: number,
  count = 12,
): void {
  if (prefersReducedMotion()) return;

  const x = originX ?? window.innerWidth / 2;
  const y = originY ?? window.innerHeight / 2;

  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle-burst';
    sparkle.textContent = SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)] ?? '✦';

    // Radiate outward in a circle
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const distance = 40 + Math.random() * 60;
    sparkle.style.setProperty('--burst-x', `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty('--burst-y', `${Math.sin(angle) * distance}px`);

    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;
    sparkle.style.fontSize = `${10 + Math.random() * 12}px`;
    sparkle.style.color = 'var(--accent-primary)';
    sparkle.style.animationDelay = `${Math.random() * 100}ms`;

    document.body.appendChild(sparkle);
    sparkle.addEventListener('animationend', () => sparkle.remove());
  }
}

/**
 * Emoji Rain — drops emoji from the top of the screen, MySpace snowflake style.
 * Good for milestones: first post, profile save, etc.
 */
export function emojiRain(
  emojis: string[] = ['✨', '💕', '⭐', '🌈', '💫'],
  count = 15,
  durationMs = 2000,
): void {
  if (prefersReducedMotion()) return;

  for (let i = 0; i < count; i++) {
    const drop = document.createElement('span');
    drop.className = 'emoji-rain';
    drop.textContent = emojis[Math.floor(Math.random() * emojis.length)] ?? '✨';

    // Random horizontal position across the viewport
    drop.style.left = `${5 + Math.random() * 90}%`;
    drop.style.fontSize = `${14 + Math.random() * 10}px`;
    drop.style.animationDuration = `${durationMs + Math.random() * 1000}ms`;
    drop.style.animationDelay = `${Math.random() * 600}ms`;

    document.body.appendChild(drop);
    drop.addEventListener('animationend', () => drop.remove());
  }
}
