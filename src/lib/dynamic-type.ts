/**
 * Dynamic Type support.
 *
 * iOS does not scale web text in a WKWebView the way it scales native UI, so
 * the system text-size setting had no effect at all: at the largest
 * accessibility size the app rendered pixel-identical to the default.
 *
 * The one lever that does track the setting inside the WebView is the
 * `-apple-system-body` font shorthand, which resolves to the user's chosen body
 * size. Measured on an iPhone 17 simulator: 17px at the default content size,
 * 53px at accessibility-extra-extra-extra-large — a 3.12x range.
 *
 * We read that value and scale the root font size by the same ratio, so every
 * rem-based size in the app (which is all of Tailwind's text-* scale) follows
 * along. The ratio is capped: 3.12x would wrap every one-line label and stack
 * every row, which needs a second set of layout rules this app does not have
 * yet. MAX_SCALE is the largest ratio at which every label still renders in
 * full — bigger text that gets truncated is not more readable.
 *
 * The floor of 1 means we only ever scale up, which also makes this a no-op on
 * platforms where `-apple-system-body` resolves to something small or is
 * ignored entirely — the web build is unaffected.
 */

/** `-apple-system-body` at the default iOS content size. */
const BODY_AT_DEFAULT_PX = 17;

/** Root font size the design is authored against. */
const ROOT_BASE_PX = 16;

/**
 * Ceiling on text growth. Set to the largest ratio at which every label still
 * fits: at 1.5x the header title and the status placeholder truncated, which
 * trades legibility for size. Raising this requires stacked layouts at large
 * sizes so labels have somewhere to go.
 */
const MAX_SCALE = 1.3;

function measureBodyTextSize(): number | null {
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.font = '-apple-system-body';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  document.body.appendChild(probe);
  const measured = Number.parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  return Number.isFinite(measured) && measured > 0 ? measured : null;
}

export function applyDynamicType(): void {
  const measured = measureBodyTextSize();
  if (measured === null) return;

  const scale = Math.min(Math.max(measured / BODY_AT_DEFAULT_PX, 1), MAX_SCALE);
  document.documentElement.style.fontSize = `${ROOT_BASE_PX * scale}px`;

  // Lets CSS drop purely decorative elements once text has grown, so the space
  // goes to the words instead. Someone who enlarged their text wants to read
  // the title, not the sparkles around it.
  document.documentElement.toggleAttribute('data-text-scaled', scale > 1);
}

export function initDynamicType(): void {
  applyDynamicType();

  // The setting is changed in Settings, not in the app, so the only signal we
  // get is coming back to the foreground.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyDynamicType();
  });
}
