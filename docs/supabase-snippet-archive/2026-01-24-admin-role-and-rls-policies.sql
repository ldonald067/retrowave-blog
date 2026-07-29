-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Admin Role and RLS Policies
-- Saved:   2026-01-24
-- Snippet: eba26340-8ea4-4a90-adf5-31ee8661d92e
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- ============================================
-- ADD ADMIN POLICIES
-- ============================================
-- Gives you (the site owner) full control
-- Run this AFTER ADD_RLS_POLICIES.sql
-- ============================================

-- STEP 1: Add is_admin column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- STEP 2: Make yourself an admin
-- REPLACE 'your-email@example.com' with your actual email!
UPDATE public.profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'retroblogwave@gmail.com'
);

-- Verify it worked
SELECT id, display_name, email, is_admin
FROM public.profiles
JOIN auth.users ON profiles.id = auth.users.id
WHERE is_admin = true;

-- STEP 3: Create helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Update posts policies to allow admin access

-- Drop existing policies
DROP POLICY IF EXISTS "Public posts viewable by all" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Recreate with admin powers
CREATE POLICY "Public posts viewable by all"
  ON posts FOR SELECT
  USING (is_private = false OR auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- STEP 5: Update post_likes policies to allow admin access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;

-- Recreate with admin powers
CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- STEP 6: Update profiles policies to allow admin access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with admin powers
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

-- Note: We don't allow admins to delete profiles - users should delete their own accounts

-- ============================================
-- VERIFICATION
-- ============================================

-- Check admin status
SELECT
  u.email,
  p.display_name,
  p.is_admin,
  CASE WHEN p.is_admin THEN '✅ Admin' ELSE '❌ Regular User' END as status
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';

-- Test the is_admin() function
SELECT is_admin() as am_i_admin;

-- ============================================
-- NOTES
-- ============================================
--
-- Admin powers include:
-- ✅ View all posts (including private)
-- ✅ Edit any post
-- ✅ Delete any post
-- ✅ Delete any like
-- ✅ Update any profile
--
-- Admins CANNOT:
-- ❌ Delete user accounts (users must delete their own)
-- ❌ Create posts as other users (still need auth.uid() = user_id)
-- ❌ Create likes as other users
--
-- Security:
-- - Only YOU have is_admin = true
-- - Don't make other users admin unless you trust them completely
-- - Admin status stored in profiles table
-- - Function is SECURITY DEFINER (safe)
