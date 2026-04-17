select
  'old public post policies removed' as check_name,
  count(*) = 0 as passed,
  count(*) as observed
from pg_policies
where schemaname = 'public'
  and tablename = 'posts'
  and policyname in (
    'Anyone can read public posts',
    'Public posts are viewable by everyone'
  );

select
  'posts select policy is owner scoped' as check_name,
  count(*) filter (where policyname = 'Users can view own posts') = 1 as passed,
  jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual)) as observed
from pg_policies
where schemaname = 'public'
  and tablename = 'posts'
  and cmd = 'SELECT';

select
  'profiles public select policy removed' as check_name,
  count(*) = 0 as passed,
  jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual)) as observed
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and cmd = 'SELECT'
  and (
    policyname = 'Anyone can read profiles'
    or qual = 'true'
  );

select
  'profiles select policy is owner scoped' as check_name,
  count(*) filter (where policyname = 'Users can view own profile') = 1 as passed,
  jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual)) as observed
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and cmd = 'SELECT';

select
  'reactions public select policy removed' as check_name,
  count(*) = 0 as passed,
  jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual)) as observed
from pg_policies
where schemaname = 'public'
  and tablename = 'post_reactions'
  and cmd = 'SELECT'
  and (
    policyname = 'Anyone can read reactions'
    or qual = 'true'
  );

select
  'reactions select policy is account scoped' as check_name,
  count(*) filter (where policyname = 'Users can read own or own-post reactions') = 1 as passed,
  jsonb_agg(jsonb_build_object('policy', policyname, 'using', qual)) as observed
from pg_policies
where schemaname = 'public'
  and tablename = 'post_reactions'
  and cmd = 'SELECT';

select
  'new posts default private' as check_name,
  column_default = 'true' as passed,
  column_default as observed
from information_schema.columns
where table_schema = 'public'
  and table_name = 'posts'
  and column_name = 'is_private';

select
  'public profile rpc filters public owner and public entries' as check_name,
  pg_get_functiondef('public.get_public_profile(text)'::regprocedure) like '%pr.is_public = true%'
    and pg_get_functiondef('public.get_public_profile(text)'::regprocedure) like '%p.is_private = false%'
    and pg_get_functiondef('public.get_public_profile(text)'::regprocedure) not like '%post_reactions%' as passed,
  null as observed;

select
  'journal feed rpc is owner scoped' as check_name,
  pg_get_functiondef('public.get_posts_with_reactions(timestamptz, integer)'::regprocedure) like '%p.user_id = auth.uid()%' as passed,
  null as observed;
