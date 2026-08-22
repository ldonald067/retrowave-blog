import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

/**
 * Tracks connectivity. Returns `true` when online.
 *
 * On the web this is `navigator.onLine` plus its events, which is the best
 * signal a browser offers.
 *
 * On iOS it must not be. Inside WKWebView `navigator.onLine` reports the web
 * view's own notion of connectivity, which routinely stays `true` with no route
 * to the internet, and the `offline` event is not dependable — so the banner
 * that is supposed to explain a failed save would simply never appear.
 * `@capacitor/network` reads the real reachability state from iOS instead.
 *
 * Verifying the native path needs a physical device in Airplane Mode or Network
 * Link Conditioner at 100% loss: the simulator shares the Mac's connection and
 * reports online regardless. See `/ios` Phase 4.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // addListener resolves to the handle, so removal has to await it.
      const handle = Network.addListener('networkStatusChange', (status) => {
        setOnline(status.connected);
      });

      // The listener only reports changes, so seed the current state — an app
      // launched with no connection would otherwise claim to be online until
      // connectivity happened to change.
      void Network.getStatus()
        .then((status) => setOnline(status.connected))
        .catch(() => {
          // Reachability unavailable: assume online rather than showing a
          // permanent offline banner over a working app.
          setOnline(true);
        });

      return () => {
        void handle.then((h) => h.remove());
      };
    }

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
