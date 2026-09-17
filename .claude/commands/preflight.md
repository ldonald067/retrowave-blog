---
name: preflight
description: Run the pre-commit gate in CI order — lint, formatting, type check, tests, build — then diagnose and fix any failures
---

# Preflight Agent

Run the full pre-commit validation pipeline and fix any failures. This is the
"measure twice, cut once" step before committing changes.

Read `CLAUDE.md` first for architecture and conventions.
Read `.claude/docs/gotchas.md` for accumulated knowledge and known footguns.

---

## Pipeline

`npm run check` runs the same five checks as CI, in CI's order, and stops at
the first failure. Run the steps one at a time when diagnosing one:

```bash
npm run lint           # Step 1: ESLint
npm run format:check   # Step 2: Prettier
npm run typecheck      # Step 3: Type check (app + vite.config.ts)
npm run test           # Step 4: All tests (Vitest)
npm run build          # Step 5: Production build (Vite)
```

Step 3 is deliberately `npm run typecheck`, not a bare `npx tsc --noEmit`: the
bare form reads only `tsconfig.json`, so it never type-checks `vite.config.ts`,
which CI does.

**NEVER run `npm run dev`** — use `npm run build` only.

**Green is not the same as complete.** CI silently ran **241 of 265** tests for
over a week. Read the count, not just the colour, and compare it to the last
known number rather than glancing at "passed".

**And green is not proof the feature works.** Several suites mock the thing they
test, and anything native-only is inert in jsdom. For user-facing work this gate
is necessary and not sufficient — verify on the simulator (`/mobile`, `/ios`).

---

## Step 1: Lint (`npm run lint`)

Lint is part of the gate, not an afterthought. It has caught two real problems
the other checks passed clean over: a `react-refresh` violation from exporting a
helper beside a component, and — after an Xcode build wrote DerivedData into
`ios/` — 266 errors from ESLint walking minified vendor bundles, with nothing
wrong in `src/` at all. The react-hooks v7 compiler rules report one bail-out per
component at a time, so re-run until it is stable.

---

## Step 2: Formatting (`npm run format:check`)

ESLint does not check formatting, which is why this is its own step. CI fails
on drift, so skipping it here means a red run after the push.

### Fixing it

Unlike the other steps, the fix is mechanical: run `npm run format`, then
re-run the check. Do not hand-edit whitespace to satisfy it.

### Keep the formatting out of the feature diff

Before formatting, look at **which** files the check flags. If a file you did
not touch is flagged, or a file you touched in a few lines comes back with
hundreds of changed lines, the drift predates your change. Formatting it inside
a feature commit buries a real change under unrelated reindentation — this
happened once, a 2-line prop addition to `App.tsx` arriving as an 800-line diff.
Put the formatting in its own commit.

A reformat can re-wrap JSX, which in principle changes rendered whitespace. To
prove one is formatting only, compile both versions under the **same filename**
(esbuild names the default export after the file) and compare the output:

```bash
npx esbuild Before.tsx --loader:.tsx=tsx --jsx=automatic --minify-whitespace --format=esm > before.js
cmp before.js after.js   # identical = formatting only
```

---

## Step 3: Type Check (`npm run typecheck`)

### Common Failures and Fixes

| Error                                                             | Cause                                                                | Fix                                                                                                |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Type 'X \| undefined' is not assignable to type 'X'`             | `noUncheckedIndexedAccess` — array indexing returns `T \| undefined` | Add `?.` optional chaining or `!` non-null assertion (only if guaranteed by logic)                 |
| `Property 'X' does not exist on type 'Y'`                         | Missing field in `database.ts` types                                 | Add the field to `Row`, `Insert`, and/or `Update` in `src/types/database.ts`                       |
| `Argument of type 'X' is not assignable to parameter of type 'Y'` | RPC type mismatch                                                    | Verify `Args` and `Returns` in `database.ts` match the SQL function signature                      |
| `Type 'PromiseLike<...>' is missing`                              | Forgot `async () =>` wrapper in `withRetry()`                        | Wrap: `withRetry(async () => supabase.from(...))`                                                  |
| `Cannot find module '@/...'` or `@components/...`                 | Path alias issue                                                     | Check `tsconfig.json` paths — aliases are `@/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@lib/*` |

### `noUncheckedIndexedAccess` Patterns

This project has strict index access. Common patterns:

```typescript
// ❌ Error: posts[0] is Post | undefined
const first = posts[0];
first.id; // Error!

// ✅ Fix: optional chaining
const first = posts[0];
if (first) first.id; // OK

// ✅ Fix: non-null assertion (only when guaranteed)
const first = posts[0]!; // Use sparingly
```

### Discriminated Union Narrowing

`requireAuth()` returns a discriminated union. TypeScript can't narrow through
`if (auth.error)` — use `auth.user!` after the guard:

```typescript
const auth = await requireAuth();
if (auth.error) return { error: auth.error };
// TypeScript doesn't know auth.user is non-null here
const userId = auth.user!.id; // Safe — union guarantees non-null when error is null
```

---

## Step 4: Tests (`npm run test`)

### Common Failures and Fixes

| Error                                                             | Cause                                                  | Fix                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `vi.mock` hoisting error                                          | Variable referenced in mock factory defined outside it | Move variable inside the `vi.mock()` factory function                   |
| `Cannot read properties of undefined (reading 'mockReturnValue')` | Mock chain incomplete                                  | Add the missing chain step (see `/test` command for chain patterns)     |
| `mockReturnThis is not a function`                                | Using `mockReturnThis()` on wrong mock                 | Use on intermediate chain steps only, not terminal ones                 |
| Timeout on `waitFor`                                              | Async operation never resolves                         | Check mock returns — the mock might not be returning the expected shape |
| `act()` warning                                                   | State update outside `act()`                           | Wrap async calls in `await act(async () => { ... })`                    |
| Test passes alone but fails in suite                              | Mock leaking between tests                             | Add `vi.clearAllMocks()` in `beforeEach`                                |

### Running Individual Tests

To isolate a failing test:

```bash
npm run test -- src/hooks/__tests__/usePosts.test.ts
npm run test -- --reporter=verbose
```

---

## Step 5: Build (`npm run build`)

### Common Failures and Fixes

| Error                          | Cause                              | Fix                                                  |
| ------------------------------ | ---------------------------------- | ---------------------------------------------------- |
| `Could not resolve "..."`      | Missing import or wrong path       | Fix the import path                                  |
| `'X' is not exported from 'Y'` | Export was removed or renamed      | Update the import to match current exports           |
| Chunk size warning             | Large bundle                       | Not a failure — just a warning. Ignore unless >500kB |
| CSS errors                     | Invalid CSS custom property syntax | Check `index.css` and `themes.ts` for syntax errors  |

### Vite-Specific Issues

- Build uses code splitting: `framer-motion`, `react-markdown`, `@supabase/supabase-js` are separate chunks
- `import.meta.env.DEV` gates are tree-shaken in production — code inside them won't cause build errors but also won't run
- Lazy imports (`React.lazy(() => import(...))`) must point to default exports

---

## Fix Strategy

When failures are found:

1. **Read the full error** — don't guess from the first line
2. **Identify the root cause** — is it a type issue, import issue, or logic issue?
3. **Fix at the source** — don't add type casts or `// @ts-ignore` to suppress real errors
4. **Re-run the failing step** — verify the fix before moving to the next step
5. **Run the full pipeline again** — fixes can introduce new issues

### When NOT to Fix

- Chunk size warnings (informational only)
- Deprecation warnings from dependencies

---

## Post-Preflight

If all five steps pass, report:

```
✅ lint:   0 problems
✅ format: all files formatted
✅ tsc:    0 errors
✅ test:   XX tests passed  (was YY — state the delta, or that it is unchanged)
✅ build:  success
```

A test count that dropped without tests being deleted is a failure wearing a
green tick.

If any step fails, report the failure, apply fixes, and re-run until clean.

---

## Cross-Domain Checks

- Type errors in `database.ts`: likely a `/migration` sync issue
- Test failures in mock chains: see `/test` for the correct patterns
- Build failures in theme variables: see `/frontend` for the variable system
- Type errors in Capacitor calls: see `/mobile` for guard patterns

$ARGUMENTS
