# False Positives (Do NOT Flag)

These have been investigated and confirmed as non-issues:

- `/fullstack`: Rate limiting RLS policies without `TO authenticated` — anon users fail the ownership policy (`user_id = auth.uid()`) anyway.
- `/fullstack`: Reactions INSERT policy combining block check + rate limit in one policy — intentionally merged.
- `/fullstack`: `ModerationResult` type duplication — architectural constraint (Deno can't share Vite imports).
- `/fullstack`: `jsonb` SQL return type vs structured TypeScript objects — PostgREST parses jsonb automatically.
- `/fullstack`: Edge function `moderate-content/index.ts` "double-read bug" — `.text()` on error path, `.json()` on success path. Never execute on same response.
- `/mobile`: Capacitor plugins using dynamic `await import(...)` — intentionally lazy-loaded.
- `/mobile`: `createProfileForUser` hand-rolled retry — intentional `23505` (unique violation) handling with re-fetch fallback.
- `/mobile`: `handleSubmit` type mismatch in ProfileModal (`onClick` passes `MouseEvent`, handler expects `FormEvent`) — tsc doesn't flag it, works at runtime.
- `/mobile`: Winamp button touch targets (20x16px) — decorative only. `aria-hidden="true"` + `tabIndex={-1}`.
- audit: ProfileModal sections use `hidden={...}` instead of conditional rendering — intentional; keeps form state mounted across tab switches (same pattern as the Section wrapper's `visible` prop).
- audit: PostModal `isDirty` wrapped in `useCallback` — required; it's a dependency of the close-guard `useCallback` and the draft `useEffect`.
- audit: App.tsx feed-height machinery (visualViewport listeners, double rAF, ResizeObserver) — load-bearing on iOS; CSS `calc()` can't track keyboard/URL-bar resizes.
- audit: `<>{toastLayer}...</>` per-branch fragments in SignUpForm/LoginForm — stylistic, works fine; restructuring is churn, not cleanup.

## From the 2026-08 adversarial reviews
- **`StatusBar.setStyle({ style: Style.Dark })` on dark themes is CORRECT.** Capacitor documents `Style.Dark` as "light text for dark backgrounds" — the enum names the background, not the text. Reversing it creates the bug the reviewer thinks they found. Filed twice now.
- **`.modal-overlay-safe` padding and `.modal-panel-safe` max-height are NOT a double-count.** The overlay's content box (`100dvh − 1rem − safeTop − safeBottom − kbd`) and the panel's max-height reduce to the same value; they agree by construction so the panel exactly fills the region above the keyboard. The real double-count was the footer and body *adding* the inset on top.
- **Touch targets measuring ~43.3px are 44px.** `getBoundingClientRect()` reads through Framer Motion's entrance `transform: scale(...)`. Measure `offsetHeight` for layout size.
- **The Winamp transport buttons (7–9px) are not touch-target violations.** `tabIndex={-1}`, decorative, deliberately tiny for the period skin. Same for `.cursor-sparkle`.
- **`w-full` buttons do not violate Apple's "avoid full-width buttons".** Apple's concern is buttons touching the screen edge; every one here sits inside a `px-4` container, so they are inset 16pt.
- **Portrait-only in `Info.plist` is a deliberate, Apple-sanctioned choice.** HIG: "sometimes your experience needs to run in only portrait… there's no need to tell people to rotate their device." Do not file it as a defect.
