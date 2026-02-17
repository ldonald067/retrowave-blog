-- Add theme column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme text DEFAULT NULL;

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id, reaction_type)
);

-- RLS policies for post_reactions
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Everyone can read reactions
CREATE POLICY "Anyone can read reactions"
  ON post_reactions FOR SELECT
  USING (true);

-- Users can insert their own reactions
CREATE POLICY "Users can insert own reactions"
  ON post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);
