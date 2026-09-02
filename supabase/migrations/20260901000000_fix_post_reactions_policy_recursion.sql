-- Fix finding 36: reactions have never worked.
--
-- Tapping any reaction fails with:
--   42P17: infinite recursion detected in policy for relation "post_reactions"
--
-- Captured on device by temporarily surfacing the raw PostgrestError instead of
-- toUserMessage's generic fallback, which is what had hidden it. The table holds
-- exactly one row in all of prod, created 2026-07-09, so this has been broken
-- since close to the day the feature shipped.
--
-- CAUSE
-- The INSERT policy rate-limits by counting the caller's recent rows:
--
--   (select count(*) from post_reactions
--     where user_id = auth.uid()
--       and created_at > now() - interval '1 minute') < 60
--
-- That is a policy ON post_reactions that SELECTs FROM post_reactions. Evaluating
-- it requires evaluating the SELECT policy on the same table, which requires
-- evaluating the policy again. Postgres detects the cycle and raises 42P17 rather
-- than looping, so the insert never happens.
--
-- Ruled out first, and none of these were the cause: the ownership clause; the
-- block check (user_blocks is empty); the rate limit being genuinely exceeded
-- (there were zero recent rows); the reaction_type CHECK constraint (the six
-- allowed emoji match the app's REACTION_EMOJIS codepoint for codepoint —
-- U+2764 U+FE0F on both sides); column drift (the app writes reaction_type,
-- which is what prod has); and a duplicate-key collision on the unique
-- constraint (nothing was ever inserted to collide with).
--
-- FIX
-- Move the count into a SECURITY DEFINER function so it runs with the definer's
-- rights and is not itself subject to RLS on post_reactions. That breaks the
-- cycle while keeping the limit's behaviour identical.
--
-- The other two clauses are unchanged and deliberately so: this migration is
-- meant to fix the recursion and nothing else about the security surface.

create or replace function public.recent_reaction_count(p_user uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.post_reactions
  where user_id = p_user
    and created_at > now() - interval '1 minute';
$$;

comment on function public.recent_reaction_count(uuid) is
  'Counts a user''s reactions in the last minute for the post_reactions INSERT
   policy. SECURITY DEFINER on purpose: called from inside a policy on
   post_reactions, so it must not re-enter that table''s RLS or the policy
   recurses (42P17). Takes the user id as an argument rather than reading
   auth.uid() internally so it cannot be repurposed to count another user.';

revoke all on function public.recent_reaction_count(uuid) from public;
grant execute on function public.recent_reaction_count(uuid) to authenticated;

drop policy if exists "Users can insert own reactions (block-aware, rate-limited)"
  on public.post_reactions;

create policy "Users can insert own reactions (block-aware, rate-limited)"
  on public.post_reactions
  for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.user_blocks ub
      join public.posts p on p.id = post_reactions.post_id
      where (ub.blocker_id = p.user_id and ub.blocked_id = auth.uid())
         or (ub.blocker_id = auth.uid() and ub.blocked_id = p.user_id)
    )
    and public.recent_reaction_count(auth.uid()) < 60
  );

-- AFTER APPLYING, VERIFY — do not assume:
--   1. Tap a reaction on device. It should stick, and
--      `select count(*) from post_reactions` should go up.
--   2. Re-check the limit still bites: it is 60/minute per user.
--   3. Re-check a blocked pair still cannot react, if you have one to test with.
--   4. Confirm anonymous clients still read 0 rows from post_reactions.
