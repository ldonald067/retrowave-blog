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
