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

  // From joined views
  display_name?: string | null;
  avatar_url?: string | null;
  like_count?: number | null;
  user_has_liked?: boolean | null;

  // Alias for view column names
  profile_display_name?: string | null;
  profile_avatar_url?: string | null;

  // Emoji reactions (populated client-side or from view)
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
