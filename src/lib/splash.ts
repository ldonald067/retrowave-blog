/**
 * The "app is ready" signal, shared between `AppInner` and `SplashCurtain`.
 *
 * The curtain covers every top-level early return (auth wall, intro, public
 * profile, moderation, age gate), so it is rendered beside `AppInner` rather
 * than inside it — which puts it out of reach of `authLoading`. It cannot call
 * `useAuth()` itself: only `App.tsx` may, or a second `onAuthStateChange`
 * subscription and racing profile inserts come with it (see gotchas).
 *
 * So this is a one-way latch instead. `AppInner` marks ready when auth
 * resolves; the curtain subscribes. The flag is module state, so a subscriber
 * mounting after the fact is told immediately rather than waiting forever.
 */

let ready = false;
const listeners = new Set<() => void>();

export function markAppReady(): void {
  if (ready) return;
  ready = true;
  for (const listener of listeners) listener();
}

export function onAppReady(listener: () => void): () => void {
  if (ready) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test seam only — the latch is deliberately one-way in the app. */
export function resetAppReadyForTests(): void {
  ready = false;
  listeners.clear();
}
