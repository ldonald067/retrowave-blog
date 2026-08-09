import { describe, it, expect } from 'vitest';
import { computeFeedHeight, feedMaxHeight } from '../feedHeight';

// iPhone 17 is 874pt tall; landscape on the same device is 402pt.
describe('computeFeedHeight', () => {
  it('fills the space below the feed on a normal portrait viewport', () => {
    expect(computeFeedHeight(874, 300)).toBe(558);
  });

  it('never exceeds what is visible on a short viewport', () => {
    // The regression: Math.max(300, available) returned 300 here, putting 214px
    // of the scroller below the fold where its rows could not be reached.
    expect(computeFeedHeight(402, 300)).toBe(86);
    expect(computeFeedHeight(402, 300)).toBeLessThan(300);
  });

  it('never exceeds what is visible with the keyboard open', () => {
    // visualViewport shrinks to ~538 with a 336px keyboard up.
    expect(computeFeedHeight(538, 420)).toBe(102);
  });

  it('caps at the viewport once the feed has scrolled above the top', () => {
    // feedTop goes negative; available would be 1058, larger than the screen.
    expect(computeFeedHeight(874, -200)).toBe(858);
  });

  it('returns zero rather than a negative height when the feed is below the fold', () => {
    expect(computeFeedHeight(874, 900)).toBe(0);
  });

  it('is never negative for any plausible input', () => {
    for (const viewport of [402, 538, 667, 874, 956]) {
      for (const top of [-400, -1, 0, 100, 500, 1200]) {
        expect(computeFeedHeight(viewport, top)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('never returns more than the space below the feed top', () => {
    for (const viewport of [402, 667, 874]) {
      for (const top of [0, 50, 200, 380]) {
        expect(computeFeedHeight(viewport, top)).toBeLessThanOrEqual(viewport - top);
      }
    }
  });
});

describe('feedMaxHeight', () => {
  it('renders a measured zero as 0px instead of falling back', () => {
    // The regression: a truthiness check sent this to calc(100dvh - 200px),
    // a ~674px scroller in exactly the case the clamp exists to prevent.
    expect(feedMaxHeight(0)).toBe('0px');
  });

  it('only falls back before the first measurement lands', () => {
    expect(feedMaxHeight(undefined)).toBe('calc(100dvh - 200px)');
  });

  it('renders ordinary measurements in px', () => {
    expect(feedMaxHeight(558)).toBe('558px');
    expect(feedMaxHeight(86)).toBe('86px');
  });

  it('never falls back for any height computeFeedHeight can produce', () => {
    for (const viewport of [402, 538, 874]) {
      for (const top of [-200, 0, 300, 900]) {
        expect(feedMaxHeight(computeFeedHeight(viewport, top))).toMatch(/^\d+(\.\d+)?px$/);
      }
    }
  });
});
