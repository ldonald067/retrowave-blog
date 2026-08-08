/** Breathing room kept below the feed so it doesn't butt against the bottom edge. */
const BOTTOM_GAP_PX = 16;

/**
 * Height for the feed's own scroll container.
 *
 * The feed scrolls inside the page, so its height has to be exactly the space
 * still visible below its top edge — no more. This used to be
 * `Math.max(300, available)`, which inflated the container whenever less than
 * 300px remained: a short landscape viewport, or the keyboard open on a small
 * phone. The extra height went below the fold, and the rows in it could not be
 * scrolled to, because the page scroll and the feed's own scroll fight over
 * which one moves.
 *
 * There is deliberately no minimum. A floor is only meaningful while the
 * viewport can honour it, and this one could not. When little of the feed is on
 * screen the container is small and correct; it grows as the page scrolls the
 * feed into view.
 *
 * @param viewportHeight visualViewport height when available — it shrinks with
 *   the keyboard, which innerHeight does not.
 * @param feedTop the feed's top edge relative to the viewport; negative once
 *   the feed has scrolled above the top of the screen.
 */
export function computeFeedHeight(viewportHeight: number, feedTop: number): number {
  const available = viewportHeight - feedTop - BOTTOM_GAP_PX;
  const mostThatFitsOnScreen = Math.max(0, viewportHeight - BOTTOM_GAP_PX);
  return Math.min(Math.max(available, 0), mostThatFitsOnScreen);
}
