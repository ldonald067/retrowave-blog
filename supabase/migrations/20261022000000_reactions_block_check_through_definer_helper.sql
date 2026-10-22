-- NOT YET APPLIED. Paste into the SQL editor; until then this file describes
-- intent, not prod.
--
-- Reactions honour blocks, and only reach your own or public entries
-- (2026-10-22, finding 113 of that day's /fullstack audit).
--
-- The INSERT policy on post_reactions checked blocks with a subquery joining
-- posts and user_blocks. A policy's subquery runs as the inserting user, under
-- RLS, and both tables are own-rows-only: someone reacting to another
-- person's entry could see neither the entry nor the owner's block row, so the
-- check never matched. Proven on prod as authenticated in a rolled-back DO
-- block: the entry was 0 rows to the reactor and the policy check was true.
-- The block dialog's "they won't be able to react to yours" was not enforced.
-- The policy also never asked whose entry it was, so anyone signed in could
-- react to any entry id, private ones included.
--
-- The check moves into can_react_to_post(), SECURITY DEFINER so it reads past
-- RLS (the shape recent_reaction_count already uses, finding 36). It allows an
-- entry that is the caller's own or publicly visible -- public page, not
-- private, not in a private chapter: is_post_publicly_visible(), the same test
-- report_public_post uses -- and refuses either direction of a block through
-- is_blocked_pair(), which finally gets a caller. It keys on auth.uid() and
-- takes no user id, so it cannot be asked about anyone else (finding 99).
--
-- As an RPC it tells a signed-in caller only what a reaction attempt already
-- does: whether an entry is public (is_post_publicly_visible is anon-callable)
-- and whether a block stands between them and its owner. EXECUTE is
-- authenticated only, because the policy calls it as the inserting user;
-- anon is revoked by name, since Supabase's default privileges grant it
-- directly.
--
-- The guard stops the whole paste, changing nothing, unless the live policy is
-- the one read on 2026-10-22 and both helpers exist.

begin;

do $$
declare
  v_check text;
begin
  select with_check into v_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'post_reactions'
    and policyname = 'Users can insert own reactions (block-aware, rate-limited)'
    and cmd = 'INSERT';
  if v_check is null
     or position('user_blocks' in v_check) = 0
     or position('recent_reaction_count(auth.uid()) < 60' in v_check) = 0 then
    raise exception 'post_reactions INSERT policy in prod is not the one this replaces; nothing changed';
  end if;
  if to_regprocedure('public.is_blocked_pair(uuid, uuid)') is null
     or to_regprocedure('public.is_post_publicly_visible(uuid)') is null then
    raise exception 'is_blocked_pair or is_post_publicly_visible missing; nothing changed';
  end if;
end
$$;

create or replace function public.can_react_to_post(p_post_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and auth.uid() is not null
      and (p.user_id = auth.uid() or public.is_post_publicly_visible(p.id))
      and not public.is_blocked_pair(auth.uid(), p.user_id)
  );
$$;

comment on function public.can_react_to_post(uuid) is
  'Reactions INSERT policy: the entry is the caller''s own or publicly visible, and no block stands between the caller and its owner. Reads past RLS; keyed on auth.uid().';

revoke all on function public.can_react_to_post(uuid) from public, anon;
grant execute on function public.can_react_to_post(uuid) to authenticated;

alter policy "Users can insert own reactions (block-aware, rate-limited)"
  on public.post_reactions
  with check (
    auth.uid() = user_id
    and public.can_react_to_post(post_id)
    and public.recent_reaction_count(auth.uid()) < 60
  );

commit;

notify pgrst, 'reload schema';

-- Verify (read-only):
--   select with_check from pg_policies
--    where tablename = 'post_reactions' and cmd = 'INSERT';
--     -> ((auth.uid() = user_id) AND can_react_to_post(post_id) AND (recent_reaction_count(auth.uid()) < 60))
--   select has_function_privilege('anon', 'public.can_react_to_post(uuid)', 'execute'),
--          has_function_privilege('authenticated', 'public.can_react_to_post(uuid)', 'execute');
--     -> false, true
--   Behaviour, as authenticated in a DO block that always raises: another
--   user's public entry -> true; another user's private entry -> false; your
--   own private entry -> true.
