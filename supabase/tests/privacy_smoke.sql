-- Privacy smoke checks.
--
-- Metadata and function-definition assertions: they prove the RLS policies and
-- RPC bodies are shaped correctly, NOT that a real session sees the right rows.
-- Pair them with the manual follow-ups in
-- docs/audit/backend-privacy-smoke-checks.md.
--
-- One statement on purpose. The Management API query endpoint returns only the
-- LAST statement's result, so a file of nine separate selects silently reports
-- one check and hides the other eight. Keep this as a single union.
--
-- Every row should come back passed = true.

with defs as (
  select
    pg_get_functiondef('public.get_public_profile(text)'::regprocedure) as public_profile,
    pg_get_functiondef(
      'public.get_posts_with_reactions(timestamptz, integer)'::regprocedure
    ) as journal_feed
),

checks as (
  select
    1 as ord,
    'old public post policies removed' as check_name,
    count(*) = 0 as passed,
    count(*)::text as observed
  from pg_policies
  where schemaname = 'public'
    and tablename = 'posts'
    and policyname in (
      'Anyone can read public posts',
      'Public posts are viewable by everyone'
    )

  union all
  select
    2,
    'posts select policy is owner scoped',
    count(*) filter (where policyname = 'Users can view own posts') = 1,
    coalesce(jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual))::text, '<no SELECT policies>')
  from pg_policies
  where schemaname = 'public' and tablename = 'posts' and cmd = 'SELECT'

  union all
  select
    3,
    'profiles public select policy removed',
    count(*) = 0,
    coalesce(jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual))::text, '0')
  from pg_policies
  where schemaname = 'public'
    and tablename = 'profiles'
    and cmd = 'SELECT'
    and (policyname = 'Anyone can read profiles' or qual = 'true')

  union all
  select
    4,
    'profiles select policy is owner scoped',
    count(*) filter (where policyname = 'Users can view own profile') = 1,
    coalesce(jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual))::text, '<no SELECT policies>')
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'

  union all
  select
    5,
    'reactions public select policy removed',
    count(*) = 0,
    coalesce(jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual))::text, '0')
  from pg_policies
  where schemaname = 'public'
    and tablename = 'post_reactions'
    and cmd = 'SELECT'
    and (policyname = 'Anyone can read reactions' or qual = 'true')

  union all
  select
    6,
    'reactions select policy is account scoped',
    count(*) filter (where policyname = 'Users can read own or own-post reactions') = 1,
    coalesce(jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual))::text, '<no SELECT policies>')
  from pg_policies
  where schemaname = 'public' and tablename = 'post_reactions' and cmd = 'SELECT'

  -- Scalar subquery, not a filtered FROM: if the column were missing entirely a
  -- plain `where column_name = 'is_private'` returns zero rows and the check
  -- disappears from the output instead of failing.
  union all
  select
    7,
    'new posts default private',
    (
      select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'posts' and column_name = 'is_private'
    ) = 'true',
    coalesce(
      (
        select column_default from information_schema.columns
        where table_schema = 'public' and table_name = 'posts' and column_name = 'is_private'
      ),
      '<column missing>'
    )

  -- Matches `is_public = true` qualified or not. Prod looks the owner up on
  -- `profiles` directly (`AND is_public = true`) and only aliases it `pr` in a
  -- later statement, so pinning the assertion to `pr.is_public` reported a
  -- false FAIL against a function that does filter correctly.
  union all
  select
    8,
    'public profile rpc filters public owner and public entries',
    position('is_public = true' in public_profile) > 0
      and position('p.is_private = false' in public_profile) > 0
      and position('post_reactions' in public_profile) = 0,
    format(
      'is_public=%s is_private=%s no_reactions=%s',
      position('is_public = true' in public_profile) > 0,
      position('p.is_private = false' in public_profile) > 0,
      position('post_reactions' in public_profile) = 0
    )
  from defs

  -- Accepts either shape. Prod resolves the caller into v_user_id first
  -- (`v_user_id := auth.uid()`) and filters on the variable, so asserting only
  -- the literal `p.user_id = auth.uid()` reported a false FAIL against a
  -- function that is correctly owner-scoped.
  union all
  select
    9,
    'journal feed rpc is owner scoped',
    position('auth.uid()' in journal_feed) > 0
      and (
        position('p.user_id = auth.uid()' in journal_feed) > 0
        or position('p.user_id = v_user_id' in journal_feed) > 0
      ),
    case
      when position('p.user_id = auth.uid()' in journal_feed) > 0 then 'filters on auth.uid() directly'
      when position('p.user_id = v_user_id' in journal_feed) > 0 then 'filters on v_user_id := auth.uid()'
      else '<no owner predicate found>'
    end
  from defs
)

select check_name, passed, observed
from checks
order by ord;
