-- APPLIED to prod 2026-10-16 (pasted into the SQL editor); the guard passed and
-- the first verify query below returned true, true. Recorded here because a
-- migration file's existence is NOT evidence it is live.
--
-- Rate-limit helpers count the caller only (2026-10-16, finding 99 of the
-- /adversarial-review that day).
--
-- recent_post_count(uuid) and recent_reaction_count(uuid) are SECURITY DEFINER,
-- so they read past RLS, and authenticated holds EXECUTE because the INSERT
-- policies on posts and post_reactions call them as the inserting user. But
-- PostgREST exposes them as RPCs too, and they counted whatever id they were
-- given: any signed-in account could ask how many entries -- private ones
-- included -- another user wrote in the last hour, and poll it to see when
-- they write.
--
-- Both policies pass auth.uid() (20261007000000 for posts, 20260901000000 for
-- post_reactions), so counting only when p_user = auth.uid() changes nothing
-- for them; any other id now counts 0. Signatures, grants and comments are
-- kept (CREATE OR REPLACE keeps the function's privileges and comment).
--
-- Bodies are the repo's, which were applied and verified (recent_post_count
-- 2026-10-13, recent_reaction_count 2026-09-02). The DO block stops the whole
-- paste, changing nothing, if prod's bodies are not those -- this session
-- could not read prod to check.

begin;

do $$
begin
  if position('interval ''1 hour''' in pg_get_functiondef('public.recent_post_count(uuid)'::regprocedure)) = 0
     or position('from public.posts' in pg_get_functiondef('public.recent_post_count(uuid)'::regprocedure)) = 0 then
    raise exception 'recent_post_count in prod is not the repo body; nothing changed';
  end if;
  if position('interval ''1 minute''' in pg_get_functiondef('public.recent_reaction_count(uuid)'::regprocedure)) = 0
     or position('from public.post_reactions' in pg_get_functiondef('public.recent_reaction_count(uuid)'::regprocedure)) = 0 then
    raise exception 'recent_reaction_count in prod is not the repo body; nothing changed';
  end if;
end
$$;

create or replace function public.recent_post_count(p_user uuid)
returns integer
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select count(*)::int
  from public.posts
  where user_id = p_user
    and p_user = auth.uid()
    and created_at > now() - interval '1 hour';
$$;

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
    and p_user = auth.uid()
    and created_at > now() - interval '1 minute';
$$;

commit;

notify pgrst, 'reload schema';

-- Verify (read-only):
--   select position('p_user = auth.uid()' in pg_get_functiondef('public.recent_post_count(uuid)'::regprocedure)) > 0,
--          position('p_user = auth.uid()' in pg_get_functiondef('public.recent_reaction_count(uuid)'::regprocedure)) > 0;
--     -> true, true
--   select p.proname, p.proacl from pg_proc p
--    where p.proname in ('recent_post_count', 'recent_reaction_count');
--     -> authenticated=X on both, no anon (unchanged)
