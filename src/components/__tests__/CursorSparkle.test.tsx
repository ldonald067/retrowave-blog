import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import CursorSparkle from '../CursorSparkle';
import { setTrailMode, TRAIL_MODES, TRAIL_MODE_OPTIONS } from '../../lib/cursorTrail';

/**
 * jsdom has no matchMedia, and CursorSparkle asks it two questions before it
 * will do anything: is reduced motion on, and is there a fine pointer. Answer
 * both the way a desktop browser would.
 */
function stubDesktopPointer() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('pointer: fine'),
      media: query,
    }))
  );
}

/** Drive the throttle forward so each mousemove is allowed to spawn. */
function moveMouse(times: number) {
  let clock = 100_000;
  const now = vi.spyOn(Date, 'now').mockImplementation(() => clock);
  for (let i = 0; i < times; i++) {
    clock += 60; // > SPAWN_INTERVAL (50ms)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 + i, clientY: 20 }));
  }
  now.mockRestore();
}

const trail = () => [...document.querySelectorAll('.cursor-sparkle')] as HTMLElement[];

describe('CursorSparkle', () => {
  beforeEach(() => {
    stubDesktopPointer();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    trail().forEach((el) => el.remove());
  });

  it('trails actual rainbows in rainbow mode', () => {
    setTrailMode('rainbow');
    render(<CursorSparkle />);

    moveMouse(6);

    const glyphs = trail().map((el) => el.textContent);
    expect(glyphs.length).toBeGreaterThan(1);
    // This mode used to emit the sparkle glyphs recoloured through a hardcoded
    // palette, so the button promised 🌈 and drew ✦.
    expect(glyphs.every((g) => g === '🌈')).toBe(true);
  });

  it('leaves emoji untinted so they keep their own colours', () => {
    setTrailMode('rainbow');
    render(<CursorSparkle />);

    moveMouse(3);

    // The old palette's yellow measured 1.03:1 against the default theme's
    // background. Emoji cannot wash out that way, but only if nothing tints them.
    expect(trail().every((el) => el.style.color === '')).toBe(true);
  });

  it('renders emoji large enough to be identifiable', () => {
    setTrailMode('rainbow');
    render(<CursorSparkle />);

    moveMouse(5);

    // A 🌈 at the 8px floor that suits `✦` is an indistinct smudge.
    const sizes = trail().map((el) => Number.parseFloat(el.style.fontSize));
    expect(Math.min(...sizes)).toBeGreaterThan(12);
  });

  it('still tints the line-glyph modes from the theme', () => {
    setTrailMode('hearts');
    render(<CursorSparkle />);

    moveMouse(4);

    const colors = trail().map((el) => el.style.color);
    expect(colors.length).toBeGreaterThan(1);
    expect(new Set(colors)).toEqual(new Set(['var(--accent-secondary)']));
  });

  it('every mode trails the glyph its own button shows', () => {
    // The rule rainbow broke. Checking it for all three stops the next mode
    // from drifting the same way.
    for (const option of TRAIL_MODE_OPTIONS) {
      const chars = TRAIL_MODES[option.id].chars as readonly string[];
      expect(chars).toContain(option.icon);
    }
  });
});
