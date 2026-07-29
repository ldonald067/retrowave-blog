-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Social App Schema & RLS Setup
-- Saved:   2026-01-24
-- Snippet: 0509b471-b258-4632-9a33-aa29a0614e4b
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- ============================================
-- RETROWAVE BLOG - COMPLETE DATABASE SETUP
-- ============================================
-- Run this ONCE in Supabase SQL Editor
-- Includes: Posts, Profiles, Likes, Age Verification
-- ============================================

-- ============================================
-- 1. FIX EXISTING POSTS TABLE
-- ============================================

-- Add missing columns if they don't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mood text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS music text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedded_links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS has_media boolean DEFAULT false;

-- Add new columns for multi-user support
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON posts(is_private);
CREATE INDEX IF NOT EXISTS idx_posts_has_media ON posts(has_media) WHERE has_media = true;

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- 2. USER PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  avatar_url text,
  birth_year integer, -- For age verification
  age_verified boolean DEFAULT false,
  tos_accepted boolean DEFAULT false, -- Terms of Service
  tos_accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT birth_year_valid CHECK (birth_year >= 1900 AND birth_year <= EXTRACT(YEAR FROM CURRENT_DATE)),
  CONSTRAINT display_name_length CHECK (char_length(display_name) <= 50),
  CONSTRAINT bio_length CHECK (char_length(bio) <= 500)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid duplicates
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile when user signs up
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update profile timestamp
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- 3. POST LIKES
-- ============================================

CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),

  -- Prevent duplicate likes
  UNIQUE(post_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
DROP POLICY IF EXISTS "Users can unlike own likes" ON post_likes;

-- Recreate policies
CREATE POLICY "Post likes are viewable by everyone"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- ============================================
-- 4. UPDATE POSTS RLS POLICIES
-- ============================================

-- Enable RLS on posts if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Private posts viewable by author only" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Recreate policies
CREATE POLICY "Public posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_private = false OR auth.uid() = user_id);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. USEFUL VIEWS
-- ============================================

-- Drop existing views first
DROP VIEW IF EXISTS posts_with_details;
DROP VIEW IF EXISTS user_stats;

-- Posts with profile info and like count
-- FIXED: Use p.display_name instead of prof.display_name
CREATE VIEW posts_with_details AS
SELECT
  p.*,
  prof.display_name AS profile_display_name,
  prof.avatar_url AS profile_avatar_url,
  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
  (SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = auth.uid())) AS user_has_liked
FROM posts p
LEFT JOIN profiles prof ON p.user_id = prof.id;

-- User statistics
CREATE VIEW user_stats AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  COUNT(DISTINCT CASE WHEN posts.is_private = false THEN posts.id END) AS public_post_count,
  COUNT(DISTINCT posts.id) AS total_post_count,
  COUNT(DISTINCT pl.id) AS total_likes_received
FROM profiles p
LEFT JOIN posts ON posts.user_id = p.id
LEFT JOIN post_likes pl ON pl.post_id = posts.id
GROUP BY p.id, p.display_name, p.avatar_url;

-- ============================================
-- SETUP COMPLETE! 🎉
-- ============================================
--
-- Next steps:
-- 1. Go to API section in Supabase
-- 2. Click refresh icon next to "Schema"
-- 3. Enable magic link auth in Authentication settings
-- 4. Start building the UI!
