// Post type definitions - reusable in React Native!

import type { LinkPreview } from './link-preview';
import type { Json } from './database';

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  author: string;
  excerpt: string;
  mood?: string | null;
  music?: string | null;
  embedded_links?: LinkPreview[] | Json | null;
  has_media: boolean;
  is_private: boolean;
  created_at: string;
  updated_at: string;

  // From get_posts_with_reactions RPC
  profile_display_name?: string | null;
  profile_avatar_url?: string | null;

  // M2: true when feed returns truncated content (> 500 chars).
  // PostModal uses this to fetch full content for view/edit modes.
  content_truncated?: boolean;

  // Emoji reactions (from RPC or optimistic update)
  reactions?: Record<string, number>;
  user_reactions?: string[];
}

export interface CreatePostInput {
  title: string;
  content: string;
  author?: string;
  excerpt?: string;
  mood?: string | null;
  music?: string | null;
  embedded_links?: Json | null;
  has_media?: boolean;
  is_private?: boolean;
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  id: string;
}
