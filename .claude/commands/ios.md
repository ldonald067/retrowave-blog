---
name: ios
description: iOS/Capacitor runtime engineering — cold start, WKWebView performance, app lifecycle, session and storage durability, offline behaviour, and the native bridge. Measurement-first, on device.
---

# iOS Runtime Agent

`/mobile` owns how the app **looks and complies** — layout, touch targets,
Dynamic Type, App Store rules. This skill owns how it **behaves as a native
app**: what it costs to start, whether it survives being backgrounded, what
happens when storage is evicted or the network drops, and whether bridge
failures are visible.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

**Produce numbers, not opinions.** Every finding here should carry a measurement
taken on device or a line of code that provably does the wrong thing. "Feels
slow" is not an output.

---

## Phase 0 — Get a trustworthy rig

Do this before measuring anything. Skipping it is how you get confident numbers
that are wrong.

```bash
xcrun simctl list devices booted          # must list a device
```

- **If nothing is booted, boot and wait.** Repeated `terminate`/`launch` cycles
  can shut a simulator down mid-run, and every subsequent `simctl io` fails with
  `NSPOSIXErrorDomain code=60` (timeout):

```bash
xcrun simctl boot <UDID>; xcrun simctl bootstatus <UDID>
```

- **Never `2>/dev/null` a probe command.** A silenced `simctl io screenshot`
  returns no file, the size check reads 0, and the probe reports a plausible
  measurement of nothing. Check exit codes and assert the artifact exists.
- **Write artifacts to a path you have confirmed writable.** `mktemp -d` lands
  under `/var/folders`, which the agent sandbox blocks — screenshots fail
  silently there. Use the session scratchpad.
- **Flush output.** A background script's stdout is block-buffered, so a probe
  that prints one line per run shows nothing until it exits. `print(..., flush=True)`.
- **Discard the first launch after a boot.** It is materially slower than the
  ones after it — cold caches, first JIT. Measure warm-cold repeatedly and say
  which you measured.
- Debug builds are slower than Release. State the configuration with the number.

## Phase 1 — Cold start and time to content

```bash
python3 scripts/ios-coldstart.py <UDID> com.retrowave.journal 3 <scratchpad>
```

It terminates, relaunches, and samples a strip of pixels each frame until the
splash gives way to the app. **Do not discriminate frames by file size** — the
splash and a loaded screen land in the same size band once the status bar is
overridden, and a size gate will report the splash as content. Luminance of a
fixed strip separates them cleanly (splash ≈ 20, loaded header ≈ 110–180).

The number is an **upper bound**: granularity is one screenshot round-trip,
about 1.5s.

**Measured here, 2026-08-20** — iPhone 17 Pro Max simulator, Debug, warm,
n=5 across two sessions: `median 1.94s, range 1.69–2.84s`. Treat a regression
past ~3s as a finding. The spread is wide relative to the median, so compare
medians of several runs, never one run against one run.

When it is slow, the cause is almost never network — the bundle ships inside the
`.app`. It is **JS parse and evaluate on the device CPU**, so the thing to
attack is how much JavaScript runs before first paint:

```bash
npm run build
python3 - <<'PY'
import re, os, glob
html = open('dist/index.html').read()
eager = set(re.findall(r'/assets/([A-Za-z0-9_.-]+\.js)', html))
tot = sum(os.path.getsize(f'dist/assets/{f}') for f in eager if os.path.exists(f'dist/assets/{f}'))
allj = sum(os.path.getsize(p) for p in glob.glob('dist/assets/*.js'))
print(f'eager {tot/1024:.0f} KB of {allj/1024:.0f} KB total ({100*tot/allj:.0f}% on the critical path)')
PY
```

**Measured here: 801 KB eager of 891 KB total — 90% on the critical path.**
(Sum actual byte sizes. `du -ck` counts allocated disk blocks and overstates
this by ~6%.)
Only the modals and route views are split. `vendor-markdown` (120 KB) and
`vendor-motion` (125 KB) are both eager; neither is needed to paint the shell.

## Phase 2 — Lifecycle: what happens on resume

The single highest-value audit in this skill, because the failures are invisible
in testing and look like unrelated bugs to users.

```bash
grep -rn "appStateChange\|getLaunchUrl\|appUrlOpen" src/
```

Check each of these:

- **Is there an `appStateChange` listener at all?** Without one, nothing
  re-validates the session, refetches stale data, or re-reads OS settings when
  the app returns from the background.
  **Finding, 2026-08-20: there is none.** `src/lib/capacitor.ts` registers
  keyboard, `appUrlOpen` and `getLaunchUrl` listeners and no lifecycle listener.
  This is the leading suspect for the unreproduced silent sign-out in
  `docs/handoff.md` — see Phase 3.
- **Cold-start deep links need `getLaunchUrl`, not just `appUrlOpen`.**
  `addListener('appUrlOpen')` only fires for a _running_ app. A link that
  launches the app from cold delivers its URL through `CapApp.getLaunchUrl()`,
  and an app handling only the listener looks like "deep links are broken
  sometimes". Already handled here (`capacitor.ts:177`) — keep it that way.
- **Anything reading an OS setting must re-read on foreground.** Dynamic Type is
  the example: it only changes while the app is backgrounded, so a one-shot read
  at startup is permanently stale. `dynamic-type.ts` uses `visibilitychange`.

Verify a resume by hand — background and restore, then confirm the app did
something:

```bash
xcrun simctl launch <UDID> com.apple.Preferences   # backgrounds the app
sleep 5
xcrun simctl launch <UDID> com.retrowave.journal   # foregrounds it
```

## Phase 3 — Session and storage durability

Two independent failure modes, both of which present as "it logged me out".

**Where does the session live?**

```bash
grep -n "persistSession\|storage\|autoRefreshToken\|flowType" src/lib/supabase.ts
```

**Finding, 2026-08-20: `createClient` is called with no auth options at all**,
so every default applies — `persistSession: true` into `localStorage`, and
`autoRefreshToken: true` on a JS timer.

Both defaults are shakier on iOS than on the web:

- **`localStorage` in WKWebView is evictable.** iOS reclaims web storage under
  disk pressure and after long idle periods. A native app that stores its only
  auth token there can be signed out by the OS with no user action and no error.
  The durable option is a Capacitor storage plugin backed by the Keychain,
  passed to `createClient` as a custom `storage` adapter.
- **The refresh timer does not run while backgrounded.** JS timers are suspended
  in a background WKWebView, so a token can expire mid-suspension. Recovery
  depends on something firing on resume — which, per Phase 2, nothing here does.

Test eviction directly rather than waiting for it in the wild:

```bash
# Sign in first, then simulate the OS reclaiming web storage.
xcrun simctl terminate <UDID> com.retrowave.journal
# Inspect or clear the WebKit store under the app's data container:
xcrun simctl get_app_container <UDID> com.retrowave.journal data
xcrun simctl launch <UDID> com.retrowave.journal
```

The app should return to a signed-in state, or fail with a real message — never
a silent bounce to the auth screen.

**Also check what the app does with a `SIGNED_OUT` it did not ask for.**

```bash
grep -rn "onAuthStateChange" -A 12 src/hooks/useAuth.ts
```

`useAuth` handles `INITIAL_SESSION` and `PASSWORD_RECOVERY` explicitly and
funnels everything else into `syncAuthState`, so an involuntary sign-out is
indistinguishable from a deliberate one. Distinguishing them is what would turn
the silent-sign-out report into a diagnosable bug.

## Phase 4 — Offline and network

```bash
grep -rn "navigator.onLine\|useOnlineStatus" src/
python3 -c "import json;d=json.load(open('package.json'));print([k for k in d['dependencies'] if 'network' in k] or 'no @capacitor/network')"
```

**Finding, 2026-08-20: offline detection is `navigator.onLine` only**
(`src/hooks/useOnlineStatus.ts`), and `@capacitor/network` is not installed.

`navigator.onLine` is unreliable inside WKWebView — it reports the web view's
notion of connectivity, which frequently stays `true` with no route to the
internet, and the `offline` event is not dependable. `@capacitor/network` reads
the real reachability state from iOS.

This one **cannot be verified on the simulator**, which shares the Mac's
connection. Confirm it on a device with Airplane Mode, or with Network Link
Conditioner set to 100% loss. Do not report it as verified from a simulator run.

Beyond detection, check behaviour: what happens to an in-flight write when the
connection drops mid-request, and does the user get their text back? The
composer autosaves a local draft — confirm that survives a failed save rather
than assuming it.

## Phase 5 — Rendering cost

Capacitor apps are judged on animation smoothness like any native app, and this
one leans on Framer Motion.

- **Never assess animation in the browser pane.** It reports
  `visibilityState: "hidden"` and throttles `requestAnimationFrame`, so
  transitions freeze or stutter for reasons that do not exist on device. This has
  already produced phantom bug reports — see `.claude/docs/gotchas.md`.
- Judge on the simulator, or better a device, by eye and by capture.
- `MotionConfig reducedMotion="user"` is set — confirm Reduce Motion actually
  suppresses transforms:

```bash
xcrun simctl ui <UDID> increase_contrast enabled   # and check Settings > Accessibility > Motion
```

- Long feeds are not virtualized. That is fine at the current entry counts; it
  becomes a finding when a feed of a few hundred entries janks on scroll.
  Measure before adding a windowing library — it costs complexity and breaks
  `ChapterChips` scroll anchoring.

## Phase 6 — Bridge hygiene

```bash
grep -n "nativeOnly\|requiredNative" src/lib/capacitor.ts
```

The pattern here is already right and should be preserved:

- `nativeOnly` swallows failures — correct for optional flourishes. A haptic that
  does not fire is not worth a log line.
- `requiredNative(label, …)` logs them — correct for anything layout or routing
  depends on.

The rule: **if a silent failure would be indistinguishable from a CSS bug, it
must use `requiredNative`.** This is not hypothetical — a single shared
`nativeOnly` block once meant a failing `setResizeMode` skipped every
`addListener` after it, `--keyboard-inset` stayed `0px`, and the composer sat
behind the keyboard. The investigation went looking in stylesheets.

When adding a bridge call, decide which of the two it is before writing it.

## Phase 7 — Gate

```bash
npx tsc --noEmit && npm run lint && npm run test
```

Then rebuild and relaunch, because none of this is exercised by jsdom:

```bash
npm run build && npx cap sync ios
```

Build and launch commands are in `.claude/commands/release.md` — there is no
`.xcworkspace`, so use `-project ios/App/App.xcodeproj`.

## Output

Report each finding as: **what was measured, on what build and device, and what
it implies.** Separate:

- **Measured** — a number from this device, with configuration stated.
- **Read from code** — a defect visible in source, not yet observed at runtime.
- **Unverifiable here** — needs a physical device (offline, thermals, real
  network). Say so rather than implying a simulator proved it.

Never promote a code reading to a measurement.

## Cross-domain

Layout, touch targets, Dynamic Type, App Store rules → `/mobile`. Theming and
CSS → `/frontend`. Supabase RPCs and hooks → `/feature`. Build and submission →
`/release`.

## Learnings

Append to the relevant topic doc under `.claude/docs/` (usually `gotchas.md`):

```
- [YYYY-MM-DD /ios] One-line finding
```

$ARGUMENTS
