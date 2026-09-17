import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('../../lib/capacitor', () => ({
  hideSplashScreen: vi.fn().mockResolvedValue(undefined),
}));

import SplashCurtain from '../SplashCurtain';
import { hideSplashScreen } from '../../lib/capacitor';
import { markAppReady, resetAppReadyForTests } from '../../lib/splash';

/**
 * The curtain covers the whole app, so the failure that matters is it never
 * leaving. These assert the exit, not the animation.
 */
describe('SplashCurtain', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAppReadyForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('covers the app until the app reports ready, then leaves', () => {
    render(<SplashCurtain />);
    expect(screen.getByTestId('splash-curtain')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('splash-curtain')).toBeInTheDocument();

    // Past its minimum already, so the exit starts on the next tick — advance
    // less than the fade, or it unmounts before the class can be asserted.
    act(() => {
      markAppReady();
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByTestId('splash-curtain')).toHaveClass('is-leaving');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId('splash-curtain')).not.toBeInTheDocument();
  });

  it('stays up for its minimum even when auth resolves immediately', () => {
    markAppReady();
    render(<SplashCurtain />);

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByTestId('splash-curtain')).not.toHaveClass('is-leaving');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('splash-curtain')).toHaveClass('is-leaving');
  });

  it('hides the native splash once it has painted', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    render(<SplashCurtain />);
    expect(hideSplashScreen).toHaveBeenCalledTimes(1);
    raf.mockRestore();
  });
});
