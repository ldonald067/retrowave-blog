-- APPLIED to prod 2026-10-07 (pasted into the SQL editor) and verified by query:
-- profiles has only "Users can insert own profile" for INSERT; posts' RESTRICTIVE
-- rate limit reads recent_post_count(auth.uid()) < 10; the function is SECURITY
-- DEFINER with search_path public, pg_temp, executable by authenticated and not
-- by anon; age_verification_check is still on profiles. Posting still works:
-- a private entry saved and deleted on the iPhone 17e as ldonald234, and its
-- posts matched the pre-test snapshot exactly afterwards. Recorded here because a
-- migration file's existence is NOT evidence it is live.
--
-- Two latent RLS fixes from the /fullstack audit of 2026-10-07. Neither is
-- reachable today; both are one schema change away from mattering. Built from
-- prod's live pg_policies rows, read the same day.
--
-- 1. profiles: drop "Enforce minimum age requirement".
--
--    Prod has it as a PERMISSIVE INSERT policy. Permissive policies are OR-ed,
--    so instead of narrowing "Users can insert own profile" it widens it: any
--    caller, anon included, passes with birth_year NULL and ANY id. The PK and
--    the FK to auth.users limit that to accounts with no profile yet, which are
--    only unconfirmed ones, and nothing exposes their ids. protect_is_admin and
--    protect_coppa_fields fire on UPDATE only, so such an insert could also set
--    is_admin.
--
--    Nothing is lost by dropping it. The table CHECK age_verification_check is
--    the same predicate (birth_year NULL or age >= 13) and already applies to
--    every INSERT and UPDATE, including the SECURITY DEFINER ones RLS skips.
--    Profiles are created by handle_new_user, which bypasses RLS, so the
--    remaining "insert own profile" policy still covers the app's fallback.
--
-- 2. posts: count recent posts through a SECURITY DEFINER function.
--
--    "Rate limit post creation" (RESTRICTIVE, 10 per hour) counts rows of posts
--    inside a policy on posts -- the shape that broke every reaction (finding
--    36, 20260901000000). It works only because posts' SELECT policy has no
--    subquery. Give that policy one and every new post fails with 42P17. Same
--    fix as reactions: the count runs with the definer's rights, outside RLS.
--    The limit is unchanged: 10 posts per user per rolling hour.
--
--    Granted to authenticated only. Supabase's default privileges also grant
--    EXECUTE to anon directly, so revoking from PUBLIC alone leaves anon able
--    to call it (that is how recent_reaction_count ended up anon-callable).

begin;

-- 1 --------------------------------------------------------------------------

drop policy if exists "Enforce minimum age requirement" on public.profiles;

-- 2 --------------------------------------------------------------------------

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
    and created_at > now() - interval '1 hour';
$$;

comment on function public.recent_post_count(uuid) is
  'Counts a user''s posts in the last hour for the posts INSERT rate limit.
   SECURITY DEFINER on purpose: called from inside a policy on posts, so it
   must not re-enter that table''s RLS or the policy can recurse (42P17).
   Same shape as recent_reaction_count.';

revoke all on function public.recent_post_count(uuid) from public, anon;
grant execute on function public.recent_post_count(uuid) to authenticated;

drop policy if exists "Rate limit post creation" on public.posts;

create policy "Rate limit post creation"
  on public.posts
  as restrictive
  for insert
  with check (public.recent_post_count(auth.uid()) < 10);

commit;

notify pgrst, 'reload schema';

-- AFTER APPLYING, VERIFY (read-only, one statement at a time):
--   select policyname, permissive, with_check from pg_policies
--     where schemaname = 'public' and tablename in ('profiles', 'posts')
--       and cmd = 'INSERT';
--     -> profiles: only "Users can insert own profile".
--     -> posts: "Users can create posts" (PERMISSIVE) and "Rate limit post
--        creation" (RESTRICTIVE, recent_post_count(auth.uid()) < 10).
--   select has_function_privilege('anon', 'public.recent_post_count(uuid)', 'EXECUTE'),
--          has_function_privilege('authenticated', 'public.recent_post_count(uuid)', 'EXECUTE');
--     -> false, true
--   select conname from pg_constraint
--     where conrelid = 'public.profiles'::regclass and conname = 'age_verification_check';
--     -> one row: 13+ is still enforced.
-- Then save one entry on a device and delete it: posting still works.
