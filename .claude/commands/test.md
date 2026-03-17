---
name: test
description: Write and fix Vitest tests for hooks and components — project-specific mock patterns, Supabase chain mocking, and testing conventions
---

# Test Agent

Write, fix, and audit tests for the Retrowave Blog app.

Read `CLAUDE.md` first. Read `.claude/learnings.md` for known gotchas.
Read existing tests in `src/hooks/__tests__/` for real examples of every pattern below.

---

## Stack

Vitest 4 + `@testing-library/react` + `@testing-library/jest-dom` + jsdom.

```bash
npm run test                                           # All tests
npm run test -- src/hooks/__tests__/usePosts.test.ts   # Single file
```

64 tests across 10 files. All 8 hooks have tests.

---

## Mock Patterns

### Rule: All mock variables MUST be inside the factory

Vitest hoists `vi.mock()` above imports. Variables outside the factory are undefined.

### Supabase Client

```typescript
// Minimal — hooks using .from() only
vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

// With auth + RPC
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(),
  },
}));
```

### Chain Mocking

Supabase builders are chainable. Use `mockReturnValue` (sync) for intermediate
steps, `mockResolvedValue` (async) for terminal steps. Always `as never` on returns.

```typescript
// INSERT: .from().insert().select().single()
const singleMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
const selectMock = vi.fn().mockReturnValue({ single: singleMock });
const insertMock = vi.fn().mockReturnValue({ select: selectMock });
vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never);

// DELETE: .from().delete().eq().eq()
const eq2 = vi.fn().mockResolvedValue({ error: null });
const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
const deleteMock = vi.fn().mockReturnValue({ eq: eq1 });
vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as never);

// SELECT with chaining: .from().select().order()
vi.mocked(supabase.from).mockReturnValue({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
} as never);
```

### Common Mocks

```typescript
// withRetry — pass-through
vi.mock('../../lib/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

// requireAuth — default logged in, override per-test
vi.mock('../../lib/auth-guard', () => ({ requireAuth: vi.fn() }));
// In beforeEach:
vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, error: null } as never);
// In test (logged out):
vi.mocked(requireAuth).mockResolvedValueOnce({ user: null, error: 'You must be logged in.' } as never);

// Cache
vi.mock('../../lib/cache', () => ({
  postsCache: { get: vi.fn().mockReturnValue(undefined), set: vi.fn(), invalidateAll: vi.fn() },
}));

// Capacitor (no-op)
vi.mock('../../lib/capacitor', () => ({ hapticImpact: vi.fn().mockResolvedValue(undefined) }));

// Validation (pass-through)
vi.mock('../../lib/validation', () => ({
  validatePostInput: vi.fn().mockReturnValue({}),
  validateEmbeddedLinks: vi.fn().mockReturnValue(null),
  hasValidationErrors: vi.fn().mockReturnValue(false),
}));
```

---

## Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// 1. vi.mock() declarations (hoisted)
// 2. Imports
// 3. Test data (mockUser, mockPost, etc.)
// 4. Helper functions for mock chains
// 5. describe() block with beforeEach(vi.clearAllMocks)
```

### Async Patterns

```typescript
// Hook that fetches on mount:
const { result } = renderHook(() => usePosts());
await waitFor(() => expect(result.current.loading).toBe(false));

// Hook method call:
await act(async () => {
  response = await result.current.toggleReaction('post-1', '❤️', []);
});
```

### What to Test
1. Happy path
2. Auth guard (requireAuth returns error)
3. Server error (Supabase returns error)
4. Edge cases (empty arrays, rapid calls, cooldowns)

### `noUncheckedIndexedAccess`
Array access returns `T | undefined` — use optional chaining:
```typescript
expect(result.current.posts[0]?.id).toBe('post-1');
```

---

## Checklist

- [ ] Mocks inside factory (hoisting)
- [ ] `as never` on all mock returns
- [ ] `vi.clearAllMocks()` in `beforeEach`
- [ ] Tests cover happy path, auth guard, and error cases
- [ ] All tests pass: `npm run test`

## Cross-Domain

- After writing tests: run `/preflight` to verify full pipeline
- Mock chain patterns depend on Supabase API shape: check `/feature` for current table → hook mapping
- New hooks need tests before commit: check existing tests in `src/hooks/__tests__/` for patterns

## Learnings

Append findings to `.claude/learnings.md`:
```
- [YYYY-MM-DD /test] One-line finding
```

$ARGUMENTS
