---
name: adversarial-review
description: Try to break recent changes on purpose — every platform, every failure after a partial success, every external call that can hang, every untrusted string that reaches HTML, SQL or email — and report only what holds up, with a concrete failure scenario for each.
---

# Adversarial Review

Review recent changes as someone trying to break them, not as their author.
The question for every change is not "does this work?" — the author already
checked that — but **"under what conditions does this do the wrong thing?"**

Read `CLAUDE.md`, `.claude/docs/gotchas.md` and
`.claude/docs/false-positives.md` first. A finding already dismissed there is
not a finding.

## Scope

`$ARGUMENTS` names the range: a commit range, "today", a feature, or a file.
With nothing given, review everything since the last `/adversarial-review`
entry in `docs/audit/ui-audit-plan.md`, or else the last day of commits:

```bash
git log --oneline --since="1 day ago" --no-merges -- src supabase public ios
```

Code and config only. Doc-only commits are out of scope.

## Attack surfaces — ask each one of every change

1. **The other platform.** This app ships as a website and as an iOS app from
   one bundle. Anything added for one runs on the other unless it is gated
   (`isNativePlatform()`). What does it cost a signed-out web visitor on a
   shared public-profile link? What does WKWebView do differently — CORS from
   `capacitor://localhost`, no `<a download>`, evictable `localStorage`?
2. **Partial success.** Find every point where something irreversible has
   already happened — a row deleted, an email sent, a session revoked — and
   then something later fails or hangs. What does the user get told, and is it
   true? Copy that asserts certainty ("nothing was removed") must be backed by
   the code path that produced it.
3. **Calls that hang.** Every `fetch` to a third party (Resend, OpenAI,
   YouTube) — is there a timeout, and what is waiting on it? A hang inside an
   edge function holds the client until the platform's wall-clock limit.
4. **Untrusted strings.** Follow every user- or visitor-supplied value into
   HTML (including email previews, subjects and `href`s), SQL, URLs and logs.
   Escaped at the point of use, or relying on a constraint somewhere else? If
   the latter, **query prod for the constraint** — never trust the migration.
5. **Who can call it.** Anything reachable with the anon key: can it act on
   another user, email an arbitrary address, or be spammed? Is authority read
   from the verified session or from the request body?
6. **Prod drift.** Does the change assume a schema, constraint, policy,
   trigger, secret or dashboard setting? Verify it live (`CLAUDE.md` has the
   recipe). This is how account deletion shipped broken for every user.
7. **State that outlives the change.** Latches, module state, cached files,
   persisted drafts, sessions on other devices (sign-out is global by default).
8. **Accessibility and motion.** New animation under Reduce Motion (needs a
   simulator reboot to test — gotchas), new content hidden with `aria-hidden`,
   new copy in `aria-label`s.

## Verify before reporting

Each finding needs one of:

- **Reproduced** — on the simulator, against prod, or the live site, with the
  evidence.
- **Proven from code** — a specific path, quoted, that provably does the wrong
  thing under a stated condition.

Anything short of that is **Plausible**, and must say what would confirm it.
Mocked tests do not count as evidence either way.

Do not fix during the review. Report, then fix what the user asks for — each fix
verified the way the finding was.

## Output

Most severe first. Per finding:

- **Severity** — CRITICAL (rejection risk, data loss, dead feature), HIGH
  (broken for a user), MEDIUM (wrong under a real condition), LOW (hardening).
- **Where** — `file:line`.
- **Failure scenario** — concrete conditions → wrong result. "Could be a
  problem" is not a scenario.
- **Status** — Reproduced / Proven from code / Plausible (and what would confirm).
- **Fix** — one line.

Then a short list of what was attacked and held up, so the next review does not
repeat it. When the user accepts findings, log them in
`docs/audit/ui-audit-plan.md` with the next finding numbers, and add a dated
`/adversarial-review` line there so the next review knows where to start.

$ARGUMENTS
