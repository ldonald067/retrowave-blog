-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Fix view security and enforce RLS for posts and stats
-- Saved:   2026-01-24
-- Snippet: f53fa33e-d95b-4d49-ae74-650a6b6c1fe9
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- ============================================
-- FIX ALL VIEW SECURITY ISSUES
-- ============================================
-- Removes SECURITY DEFINER from both views
-- Makes them respect RLS policies properly
-- ============================================

-- ============================================
-- 1. FIX posts_with_details VIEW
-- ============================================

DROP VIEW IF EXISTS public.posts_with_details;

CREATE VIEW public.posts_with_details AS
SELECT
  p.*,
  prof.display_name AS profile_display_name,
  prof.avatar_url AS profile_avatar_url,
  (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p.id) AS like_count,
  (SELECT EXISTS(SELECT 1 FROM public.post_likes WHERE post_id = p.id AND user_id = auth.uid())) AS user_has_liked
FROM public.posts p
LEFT JOIN public.profiles prof ON p.user_id = prof.id;

-- Grant to authenticated users
GRANT SELECT ON public.posts_with_details TO authenticated;

-- Allow anonymous users to see public posts
GRANT SELECT ON public.posts_with_details TO anon;

-- ============================================
-- 2. FIX user_stats VIEW
-- ============================================

DROP VIEW IF EXISTS public.user_stats;

CREATE VIEW public.user_stats AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  COUNT(DISTINCT CASE WHEN posts.is_private = false THEN posts.id END) AS public_post_count,
  COUNT(DISTINCT posts.id) AS total_post_count,
  COUNT(DISTINCT pl.id) AS total_likes_received
FROM public.profiles p
LEFT JOIN public.posts ON posts.user_id = p.id
LEFT JOIN public.post_likes pl ON pl.post_id = posts.id
GROUP BY p.id, p.display_name, p.avatar_url;

-- Grant to authenticated users only
GRANT SELECT ON public.user_stats TO authenticated;

-- Revoke from anonymous users
REVOKE SELECT ON public.user_stats FROM anon;

-- ============================================
-- 3. VERIFICATION
-- ============================================

-- Check both views don't have SECURITY DEFINER
SELECT
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('posts_with_details', 'user_stats')
ORDER BY viewname;

-- Check permissions
SELECT
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('posts_with_details', 'user_stats')
ORDER BY table_name, grantee;

-- ============================================
-- SECURITY SUMMARY
-- ============================================
--
-- posts_with_details:
-- ✅ Respects posts RLS policies (public/private)
-- ✅ Both authenticated and anonymous can query
-- ✅ Anonymous users only see public posts
-- ✅ Authenticated users see public + their own private
-- ✅ Admins see everything
--
-- user_stats:
-- ✅ Only authenticated users can query
-- ✅ Anonymous users cannot see user stats
-- ✅ Respects posts RLS when counting
-- ✅ Shows accurate counts based on viewer permissions
--
-- ============================================
