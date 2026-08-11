/**
 * Reduced-motion check for imperative animations.
 *
 * Three layers cover motion in this app and they do not overlap:
 *   - Framer Motion components: `<MotionConfig reducedMotion="user">` in App.tsx
 *   - CSS keyframes: the `prefers-reduced-motion` block in index.css
 *   - DOM nodes built and animated by hand: this helper
 *
 * The third layer is the one a global setting cannot reach — the cursor trail
 * and the celebration effects append elements themselves, so they have to ask.
 * They each restated the media query, which is the kind of duplication that
 * drifts: fixing a bug in one copy leaves the other animating.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
