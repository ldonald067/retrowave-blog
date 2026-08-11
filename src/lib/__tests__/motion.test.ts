import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefersReducedMotion } from '../motion';

/**
 * jsdom does not implement `window.matchMedia` at all here — it is undefined,
 * not merely non-matching — so the test has to supply it. Deliberately not
 * guarded in the helper itself: matchMedia is universal in real browsers and in
 * WKWebView, and adding a fallback would only be shaping production code around
 * a test environment's gap.
 *
 * Only matchMedia's answer is stubbed; the helper's own logic runs for real.
 */
function stubMatchMedia(matches: boolean) {
  const impl = vi.fn((query: string) => ({ matches, media: query }) as MediaQueryList);
  vi.stubGlobal('matchMedia', impl);
  return impl;
}

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true when the user has asked for reduced motion', () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('is false by default, so the retro effects stay on for everyone else', () => {
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('asks for exactly the query the browser understands', () => {
    // The failure mode worth guarding: a typo'd or malformed media query never
    // matches, so this returns false forever and every animation keeps running
    // for the people who asked for none. Asserting `false` cannot catch that,
    // because false is also the correct answer when the setting is off.
    const impl = stubMatchMedia(false);

    prefersReducedMotion();

    expect(impl).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
});
