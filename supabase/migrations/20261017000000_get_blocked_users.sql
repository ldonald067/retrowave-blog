-- APPLIED to prod 2026-10-18 (pasted into the SQL editor); the verify query
-- below returned false, true, true, and the function is SECURITY DEFINER.
-- Recorded here because a migration file's existence is NOT evidence it is live.
--
-- get_blocked_users() -- the safety tab's list, with names (2026-10-17,
-- finding 100).
--
-- The tab listed each block as the first 8 characters of a user id: profiles'
-- SELECT policy is own-row only and user_blocks.blocked_id references
-- auth.users, so the client has no way to join a block to a name (read from
-- prod 2026-10-17).
--
-- The username and display name come back only while the blocked person's page
-- is public -- the test get_public_profile uses. toggle_user_block accepts any
-- id, and a post's owner can read the user_id of everyone who reacted to it
-- (post_reactions' SELECT policy), so names returned unconditionally would let
-- anyone block a reactor and read their name off this list: an id-to-username
-- lookup for private journals. Every block the app makes starts on a public
-- page, so in normal use the name is there; a page made private later shows
-- the app's fallback instead.
--
-- Supabase's default privileges grant EXECUTE to anon directly, so the revoke
-- names anon as well as public (see 20261008000000).

create or replace function public.get_blocked_users()
returns table (blocked_id uuid, created_at timestamptz, username text, display_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.blocked_id,
         b.created_at,
         case when p.is_public then p.username end,
         case when p.is_public then p.display_name end
  from public.user_blocks b
  left join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

revoke all on function public.get_blocked_users() from public, anon;
grant execute on function public.get_blocked_users() to authenticated;

-- Verify (read-only; expect false, true, true):
--   select has_function_privilege('anon', 'public.get_blocked_users()', 'execute'),
--          has_function_privilege('authenticated', 'public.get_blocked_users()', 'execute'),
--          position('p.is_public' in pg_get_functiondef('public.get_blocked_users()'::regprocedure)) > 0;
