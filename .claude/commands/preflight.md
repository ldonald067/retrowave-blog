---
name: preflight
description: Run pre-commit validation pipeline — type check, build, tests — then diagnose and fix any failures
---

# Preflight Agent

Run the full pre-commit validation pipeline and fix any failures. This is the
"measure twice, cut once" step before committing changes.

Read `CLAUDE.md` first for architecture and conventions.
Read `.claude/learnings.md` for accumulated knowledge and known gotchas.

---

## Pipeline

Run all three checks in sequence (each depends on the previous passing):

```bash
npx tsc --noEmit       # Step 1: Type check
npm run build          # Step 2: Production build (Vite)
npm run test           # Step 3: All tests (Vitest)
```

**NEVER run `npm run dev`** — use `npm run build` only.

---

## Step 1: Type Check (`npx tsc --noEmit`)

### Common Failures and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Type 'X \| undefined' is not assignable to type 'X'` | `noUncheckedIndexedAccess` — array indexing returns `T \| undefined` | Add `?.` optional chaining or `!` non-null assertion (only if guaranteed by logic) |
| `Property 'X' does not exist on type 'Y'` | Missing field in `database.ts` types | Add the field to `Row`, `Insert`, and/or `Update` in `src/types/database.ts` |
| `Argument of type 'X' is not assignable to parameter of type 'Y'` | RPC type mismatch | Verify `Args` and `Returns` in `database.ts` match the SQL function signature |
| `Type 'PromiseLike<...>' is missing` | Forgot `async () =>` wrapper in `withRetry()` | Wrap: `withRetry(async () => supabase.from(...))` |
| `Cannot find module '@/...'` or `@components/...` | Path alias issue | Check `tsconfig.json` paths — aliases are `@/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@lib/*` |

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

## Step 2: Build (`npm run build`)

### Common Failures and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Could not resolve "..."` | Missing import or wrong path | Fix the import path |
| `'X' is not exported from 'Y'` | Export was removed or renamed | Update the import to match current exports |
| Chunk size warning | Large bundle | Not a failure — just a warning. Ignore unless >500kB |
| CSS errors | Invalid CSS custom property syntax | Check `index.css` and `themes.ts` for syntax errors |

### Vite-Specific Issues

- Build uses code splitting: `framer-motion`, `react-markdown`, `@supabase/supabase-js` are separate chunks
- `import.meta.env.DEV` gates are tree-shaken in production — code inside them won't cause build errors but also won't run
- Lazy imports (`React.lazy(() => import(...))`) must point to default exports

---

## Step 3: Tests (`npm run test`)

### Common Failures and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `vi.mock` hoisting error | Variable referenced in mock factory defined outside it | Move variable inside the `vi.mock()` factory function |
| `Cannot read properties of undefined (reading 'mockReturnValue')` | Mock chain incomplete | Add the missing chain step (see `/test` command for chain patterns) |
| `mockReturnThis is not a function` | Using `mockReturnThis()` on wrong mock | Use on intermediate chain steps only, not terminal ones |
| Timeout on `waitFor` | Async operation never resolves | Check mock returns — the mock might not be returning the expected shape |
| `act()` warning | State update outside `act()` | Wrap async calls in `await act(async () => { ... })` |
| Test passes alone but fails in suite | Mock leaking between tests | Add `vi.clearAllMocks()` in `beforeEach` |

### Running Individual Tests

To isolate a failing test:
```bash
npm run test -- src/hooks/__tests__/usePosts.test.ts
npm run test -- --reporter=verbose
```

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
- ESLint warnings (run `npm run lint` separately if needed)

---

## Post-Preflight

If all three steps pass, report:
```
✅ tsc:   0 errors
✅ build: success
✅ test:  XX tests passed
```

If any step fails, report the failure, apply fixes, and re-run until clean.

---

## Cross-Domain Checks

- Type errors in `database.ts`: likely a `/migration` sync issue
- Test failures in mock chains: see `/test` for the correct patterns
- Build failures in theme variables: see `/frontend` for the variable system
- Type errors in Capacitor calls: see `/mobile` for guard patterns

$ARGUMENTS
