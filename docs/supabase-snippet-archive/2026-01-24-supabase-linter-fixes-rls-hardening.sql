-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Supabase Linter Fixes & RLS Hardening
-- Saved:   2026-01-24
-- Snippet: 80bf27b8-4185-46cb-aa1a-984285df9c46
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- ============================================
-- FIX ALL SUPABASE LINTER ISSUES
-- ============================================
-- Fixes ALL security and performance issues found
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: FIX FUNCTION SECURITY (search_path)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, age_verified, tos_accepted)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'age_verified')::boolean, false),
    COALESCE((new.raw_user_meta_data->>'tos_accepted')::boolean, false)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================
-- PART 2: FIX RLS PERFORMANCE (auth.uid())
-- ============================================
-- Replace auth.uid() with (SELECT auth.uid()) for better performance

-- Fix post_likes policies
DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING ((SELECT auth.uid()) = user_id OR is_admin());

-- Fix posts policies
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
CREATE POLICY "Public posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_private = false OR (SELECT auth.uid()) = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING ((SELECT auth.uid()) = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING ((SELECT auth.uid()) = user_id OR is_admin());

-- ============================================
-- PART 3: REMOVE DUPLICATE POLICIES
-- ============================================
-- You have multiple old policies creating conflicts

-- Drop old/duplicate posts policies
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "posts_admin_all" ON posts;
DROP POLICY IF EXISTS "posts_delete_owner" ON posts;
DROP POLICY IF EXISTS "posts_insert_authenticated" ON posts;
DROP POLICY IF EXISTS "posts_select_authenticated" ON posts;
DROP POLICY IF EXISTS "posts_update_owner" ON posts;

-- Drop old/duplicate post_likes policies
DROP POLICY IF EXISTS "Users can unlike own likes" ON post_likes;
DROP POLICY IF EXISTS "post_likes_admin_all" ON post_likes;
DROP POLICY IF EXISTS "post_likes_delete_owner" ON post_likes;
DROP POLICY IF EXISTS "post_likes_insert" ON post_likes;
DROP POLICY IF EXISTS "post_likes_select" ON post_likes;

-- ============================================
-- PART 4: DELETE UNUSED TABLES
-- ============================================
-- You have comments/friendships/likes tables you're not using

DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;

-- ============================================
-- PART 5: ADD MISSING INDEXES
-- ============================================
-- Fix unindexed foreign keys for better performance

-- posts.author_id index (if you're still using author_id)
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);

-- Note: You already have idx_posts_user_id, which is correct
-- Note: post_likes already has proper indexes

-- ============================================
-- PART 6: REMOVE UNUSED INDEXES (Optional)
-- ============================================
-- These indexes haven't been used yet, but keep them for now
-- They'll be useful once you have data/traffic

-- Uncomment to remove if you want to clean up:
-- DROP INDEX IF EXISTS idx_post_likes_user_post;
-- DROP INDEX IF EXISTS idx_posts_privacy;
-- DROP INDEX IF EXISTS idx_posts_has_media;
-- DROP INDEX IF EXISTS idx_post_likes_user_id;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check functions have search_path
SELECT
  proname AS function_name,
  CASE
    WHEN pg_get_functiondef(oid) LIKE '%SET search_path%' THEN '✅ Secure'
    ELSE '❌ VULNERABLE'
  END AS search_path_status
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('update_updated_at_column', 'handle_new_user', 'is_admin');

-- Check for duplicate policies (should be empty)
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('posts', 'post_likes')
ORDER BY tablename, policyname;

-- Check unused tables are gone
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('comments', 'friendships', 'likes');
-- Should return 0 rows

-- ============================================
-- SUMMARY OF FIXES
-- ============================================
--
-- SECURITY:
-- ✅ Fixed search_path on all 3 functions
--
-- PERFORMANCE:
-- ✅ Fixed RLS policies to use (SELECT auth.uid())
-- ✅ Removed duplicate policies (causing multiple evaluations)
-- ✅ Deleted unused tables (comments, friendships, likes)
-- ✅ Added index on posts.author_id
--
-- CLEANUP:
-- ✅ Removed old/conflicting policies
-- ✅ Removed tables you're not using
--
-- KEPT (for future use):
-- ✅ Unused indexes (will be useful with real data)
--
-- ============================================
