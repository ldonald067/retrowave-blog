import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

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

// isNativePlatform is read at module load, so each platform needs its own import.
async function loadWith(native: boolean) {
  vi.doMock('../capacitor', () => ({ isNativePlatform: native }));
  vi.resetModules();
  return import('../dynamic-type');
}

const rootSize = () => document.documentElement.style.fontSize;

describe('applyDynamicType on iOS', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('font-size');
    document.documentElement.removeAttribute('data-text-scaled');
  });
  afterEach(() => {
    document.documentElement.style.removeProperty('font-size');
    document.documentElement.removeAttribute('data-text-scaled');
    vi.doUnmock('../capacitor');
    vi.resetModules();
  });

  it('leaves the root size alone at the default iOS body size', async () => {
    const { applyDynamicType } = await loadWith(true);
    withBodyTextSize('17px', applyDynamicType);
    expect(rootSize()).toBe('');
  });

  it('scales proportionally below the cap', async () => {
    const { applyDynamicType } = await loadWith(true);
    // 20.4 / 17 = 1.2 -> 16 * 1.2
    withBodyTextSize('20.4px', applyDynamicType);
    expect(rootSize()).toBe('19.2px');
  });

  it('caps growth at 1.3x rather than following iOS all the way to 3.12x', async () => {
    const { applyDynamicType } = await loadWith(true);
    // 53px is the measured value at accessibility-extra-extra-extra-large.
    withBodyTextSize('53px', applyDynamicType);
    expect(rootSize()).toBe('20.8px');
  });

  it('undoes a previous scale-up when the content size returns to default', async () => {
    const { applyDynamicType } = await loadWith(true);
    withBodyTextSize('53px', applyDynamicType);
    expect(rootSize()).toBe('20.8px');
    expect(document.documentElement.hasAttribute('data-text-scaled')).toBe(true);

    withBodyTextSize('17px', applyDynamicType);
    expect(rootSize()).toBe('');
    expect(document.documentElement.hasAttribute('data-text-scaled')).toBe(false);
  });

  it('does nothing when the probe yields no usable size', async () => {
    const { applyDynamicType } = await loadWith(true);
    withBodyTextSize(null, applyDynamicType);
    expect(rootSize()).toBe('');
  });
});

describe('applyDynamicType on the web', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('font-size');
    vi.doUnmock('../capacitor');
    vi.resetModules();
  });

  it('never touches the root size, whatever the probe reports', async () => {
    const { applyDynamicType } = await loadWith(false);

    // Off Apple platforms `-apple-system-body` is invalid, so the probe just
    // reports the reader's own default. Treating that as an iOS ratio is how a
    // reader who chose 20px got 16 x (20/17) = 18.8px written back — shrinking
    // the preference this feature exists to respect. Browsers already scale rem
    // with that setting, so there is nothing here to do.
    for (const probe of ['20px', '24px', '13px', '17px']) {
      withBodyTextSize(probe, applyDynamicType);
      expect(rootSize()).toBe('');
    }
  });
});
