import { useEffect, useState } from 'react';
import { hideSplashScreen } from '../lib/capacitor';
import { onAppReady } from '../lib/splash';

/**
 * The animated hand-off from the native launch image.
 *
 * iOS renders `LaunchScreen.storyboard` as a still image — a launch screen
 * cannot animate. What it can do is hand over: this curtain draws the same
 * composition as `splash-2732x2732.png` (the icon on the classic-xanga
 * gradient inside a dotted frame), so hiding the native splash once this has
 * painted is invisible, and from there the icon can actually move.
 *
 * Fixed classic-xanga colours, not theme variables, for that reason: the launch
 * image is a fixed asset and cannot know the reader's theme. A returning
 * emo-dark reader does see light-then-dark either way; doing it inside the
 * fade-out is gentler than a cut on hand-off.
 *
 * Reduce Motion needs nothing here. The global `prefers-reduced-motion` block
 * in `index.css` collapses every animation to 0.01ms, and each keyframe below
 * ends at the state it should rest in, so it snaps to the finished frame.
 */

/** Long enough that the pop is seen rather than glimpsed. */
const MIN_VISIBLE_MS = 850;
/** Matches --splash-fade in index.css. */
const FADE_MS = 400;

export default function SplashCurtain() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  // The native splash sits above the web view, so it has to go before any of
  // this is visible — but only once we have painted, or the hand-off shows a
  // blank frame. Two rAFs: one to be laid out, one to be on screen.
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => void hideSplashScreen());
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    // Read on mount, not during render: the react-hooks compiler rules count
    // Date.now() in a render body as an impure call, and rightly.
    const mountedAt = Date.now();
    let leaveTimer = 0;
    let goneTimer = 0;
    const unsubscribe = onAppReady(() => {
      const shown = Date.now() - mountedAt;
      leaveTimer = window.setTimeout(
        () => {
          setLeaving(true);
          goneTimer = window.setTimeout(() => setGone(true), FADE_MS);
        },
        Math.max(0, MIN_VISIBLE_MS - shown)
      );
    });
    return () => {
      unsubscribe();
      if (leaveTimer) clearTimeout(leaveTimer);
      if (goneTimer) clearTimeout(goneTimer);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`splash-curtain${leaving ? ' is-leaving' : ''}`}
      // Decoration over a screen that is not ready yet: the app announces
      // itself once it renders, and there is nothing to read or press here.
      aria-hidden="true"
      data-testid="splash-curtain"
    >
      <div className="splash-frame">
        {/* splash-icon.png, not icon-192/512: those carry the dark navy padding
            the home screen wants, which would show as a square behind the tile.
            This is the same full-bleed art the launch image uses. */}
        <img src="/splash-icon.png" alt="" className="splash-icon" width={256} height={256} />
        {/* ✦, not ✨: emoji ignore `color`, and these are tinted. */}
        <span className="splash-sparkle splash-sparkle-1">✦</span>
        <span className="splash-sparkle splash-sparkle-2">✦</span>
        <span className="splash-sparkle splash-sparkle-3">✦</span>
        <span className="splash-sparkle splash-sparkle-4">✦</span>
      </div>
    </div>
  );
}
