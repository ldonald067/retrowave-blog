-- APPLIED to prod 2026-10-13 (pasted into the SQL editor) and verified by query:
-- is_blocked_pair is executable by postgres and service_role only;
-- recent_reaction_count by authenticated (and the owner and service_role), not
-- anon - the same ACL as recent_post_count. Called under SET ROLE:
-- authenticated gets a count from recent_reaction_count; anon gets 42501 from
-- it, and authenticated gets 42501 from is_blocked_pair. Recorded here because
-- a migration file's existence is NOT evidence it is live.
--
-- Close two SECURITY DEFINER helpers to callers that never needed them. Built
-- from prod's live grants and callers, read 2026-10-08:
--
--   is_blocked_pair(uuid, uuid)  EXECUTE: PUBLIC, anon, authenticated
--   recent_reaction_count(uuid)  EXECUTE: anon, authenticated
--   recent_post_count(uuid)      EXECUTE: authenticated only (the target state)
--
-- 1. is_blocked_pair answers whether two users have a block, given their UUIDs,
--    with the definer's rights - so anyone, signed in or not, could ask. It has
--    no callers left in prod: no policy, view or function references it (the
--    post_reactions INSERT policy checks user_blocks inline), and neither the
--    app nor an edge function calls it. Revoked from everyone but service_role.
--    PUBLIC holds a grant too, so revoking from anon alone would change nothing.
--
-- 2. recent_reaction_count is called by the post_reactions INSERT policy, which
--    runs as the inserting user, so authenticated keeps EXECUTE. anon was
--    already refused by that policy's auth.uid() = user_id; if Postgres now
--    evaluates the count first, the refusal is "permission denied for
--    function" instead. Either way an anon reaction fails, as before.
--
-- Supabase's default privileges grant EXECUTE to anon directly, which is why
-- each revoke names anon as well as PUBLIC (see 20261007000000).

begin;

revoke all on function public.is_blocked_pair(uuid, uuid) from public, anon, authenticated;

revoke all on function public.recent_reaction_count(uuid) from public, anon;
grant execute on function public.recent_reaction_count(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';
