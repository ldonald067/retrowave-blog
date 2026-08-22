import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';

const nativeState = { isNative: false };
const netListeners: Array<(s: { connected: boolean }) => void> = [];
const removeSpy = vi.fn();
const getStatus = vi.fn(async () => ({ connected: true }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativeState.isNative },
}));

vi.mock('@capacitor/network', () => ({
  Network: {
    addListener: vi.fn(async (_event: string, cb: (s: { connected: boolean }) => void) => {
      netListeners.push(cb);
      return { remove: removeSpy };
    }),
    getStatus: () => getStatus(),
  },
}));

describe('useOnlineStatus', () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('updates to false when offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });

  it('updates to true when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    // Should have registered online + offline listeners
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    // Should have removed them
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('useOnlineStatus on native', () => {
  beforeEach(() => {
    nativeState.isNative = true;
    netListeners.length = 0;
    removeSpy.mockClear();
    getStatus.mockClear().mockResolvedValue({ connected: true });
  });

  afterEach(() => {
    nativeState.isNative = false;
  });

  it('ignores navigator.onLine and uses real reachability', async () => {
    // The whole point: inside WKWebView navigator.onLine routinely claims to be
    // online with no route to the internet, so the banner would never show.
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    getStatus.mockResolvedValue({ connected: false });

    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('seeds from getStatus, since the listener only reports changes', async () => {
    getStatus.mockResolvedValue({ connected: false });
    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => expect(result.current).toBe(false));
    expect(getStatus).toHaveBeenCalled();
  });

  it('follows networkStatusChange events', async () => {
    const { result } = renderHook(() => useOnlineStatus());
    await waitFor(() => expect(result.current).toBe(true));

    act(() => netListeners.forEach((cb) => cb({ connected: false })));
    expect(result.current).toBe(false);

    act(() => netListeners.forEach((cb) => cb({ connected: true })));
    expect(result.current).toBe(true);
  });

  it('assumes online when reachability is unavailable', async () => {
    // Better than pinning a permanent offline banner over a working app.
    getStatus.mockRejectedValue(new Error('plugin unavailable'));
    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('removes the native listener on unmount', async () => {
    const { unmount } = renderHook(() => useOnlineStatus());
    await waitFor(() => expect(netListeners.length).toBe(1));

    unmount();

    await waitFor(() => expect(removeSpy).toHaveBeenCalled());
  });
});
