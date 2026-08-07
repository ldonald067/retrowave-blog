import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { applyDynamicType } from '../dynamic-type';

/**
 * These do not mock the thing under test. applyDynamicType reads a real
 * computed style off a real probe element; only the value getComputedStyle
 * reports is controlled, which is exactly the input iOS varies.
 */
function withBodyTextSize(px: string | null, run: () => void) {
  const real = window.getComputedStyle;
  const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element) => {
    // jsdom rejects `style.font = '-apple-system-body'` as invalid CSS, so the
    // probe is identified by the attribute the module sets on it instead.
    if (
      el instanceof HTMLElement &&
      el.tagName === 'SPAN' &&
      el.getAttribute('aria-hidden') === 'true'
    ) {
      return { fontSize: px ?? '' } as CSSStyleDeclaration;
    }
    return real.call(window, el);
  }) as typeof window.getComputedStyle);
  try {
    run();
  } finally {
    spy.mockRestore();
  }
}

describe('applyDynamicType', () => {
  beforeEach(() => {
    document.documentElement.style.fontSize = '';
  });
  afterEach(() => {
    document.documentElement.style.fontSize = '';
  });

  it('leaves the root size alone at the default iOS body size', () => {
    withBodyTextSize('17px', applyDynamicType);
    expect(document.documentElement.style.fontSize).toBe('16px');
  });

  it('scales proportionally below the cap', () => {
    // 20.4 / 17 = 1.2 -> 16 * 1.2
    withBodyTextSize('20.4px', applyDynamicType);
    expect(document.documentElement.style.fontSize).toBe('19.2px');
  });

  it('caps growth at 1.3x rather than following iOS all the way to 3.12x', () => {
    // 53px is the measured value at accessibility-extra-extra-extra-large.
    withBodyTextSize('53px', applyDynamicType);
    expect(document.documentElement.style.fontSize).toBe('20.8px');
  });

  it('never scales below the design base, so non-iOS builds are unaffected', () => {
    withBodyTextSize('13px', applyDynamicType);
    expect(document.documentElement.style.fontSize).toBe('16px');
  });

  it('does nothing when the probe yields no usable size', () => {
    withBodyTextSize(null, applyDynamicType);
    expect(document.documentElement.style.fontSize).toBe('');
  });
});
