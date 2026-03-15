---
name: migration
description: Create Supabase SQL migrations and keep all cross-file sync points updated — database.ts types, validation limits, constants, and RLS policies
---

# Migration Agent

Create Supabase SQL migrations and keep cross-file sync points consistent.

Read `CLAUDE.md` first. Read `.claude/learnings.md` for known gotchas.
Read existing migrations in `supabase/migrations/` for patterns.

---

## Migration File

Name: `supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql`

### Required Boilerplate

```sql
-- New tables:
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON public.new_table FOR SELECT USING (user_id = auth.uid());

-- Mutation RPCs:
GRANT EXECUTE ON FUNCTION public.my_function TO authenticated;

-- Always end with:
NOTIFY pgrst, 'reload schema';
```

### SECURITY DEFINER Pattern

For functions bypassing RLS or trigger-protected fields:
```sql
CREATE OR REPLACE FUNCTION public.my_function(...)
RETURNS ... LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ BEGIN
  -- Fully-qualified auth.users (auth schema not in search_path)
  -- set_config('app.bypass_...', 'true', true) to bypass triggers
END; $$;
```

---

## Cross-File Sync Points (CRITICAL)

When a migration changes schema, these files MUST be updated in lockstep:

### 1. `src/types/database.ts`

| SQL Change | Update |
|------------|--------|
| New table | Add `Row`, `Insert`, `Update`, `Relationships` to `Tables` |
| New column | Add to `Row` + `Insert` (optional?) + `Update` (optional?) |
| New RPC | Add to `Functions` with `Args` and `Returns` |
| Dropped entity | Remove from types |

RPCs returning `jsonb` → structured TS objects (PostgREST parses automatically).
Void RPCs → `Returns: undefined` (not `void`).

### 2. `src/lib/validation.ts`

If CHECK constraints change, update `POST_LIMITS` or `PROFILE_LIMITS` and the
corresponding `validatePostInput()` / `validateProfileInput()` function.

### 3. `src/lib/constants.ts`

Re-exports `POST_LIMITS` and `PROFILE_LIMITS`. Update if adding a new limits object.

### 4. `src/components/ui/ReactionBar.tsx` + `src/lib/emojiStyles.ts`

If emoji CHECK constraint changes, update `REACTION_EMOJIS` and the preload set.

### 5. RLS Policies

New UGC tables may need `is_blocked_pair()` enforcement and rate limiting
(see `20260225000005_rate_limiting.sql`).

### 6. Trigger-Protected Fields

| Field | Trigger | Bypass |
|-------|---------|--------|
| `profiles.is_admin` | Silently preserves | SECURITY DEFINER only |
| `profiles.age_verified/tos_accepted/birth_year` | Blocks UPDATE | `set_age_verification` RPC |

---

## Workflow

1. Write SQL migration
2. Update `database.ts` types
3. Update `validation.ts` limits (if CHECK constraints changed)
4. Update domain types in `src/types/` (if shape changed)
5. Wire up in hook (if new RPC)
6. Verify: `npx tsc --noEmit && npm run build && npm run test`

## Audit Mode

When invoked without a task, check all sync points for drift and report:

| Sync Point | Status | Details |
|-----------|--------|---------|
| ... | IN SYNC / DRIFT | ... |

## Learnings

Append findings to `.claude/learnings.md`:
```
- [YYYY-MM-DD /migration] One-line finding
```

$ARGUMENTS
