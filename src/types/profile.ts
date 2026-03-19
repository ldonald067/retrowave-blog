// User profile types

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  birth_year: number | null;
  age_verified: boolean;
  tos_accepted: boolean;
  theme: string | null;
  current_mood: string | null;
  current_music: string | null;
  is_admin: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/** Public-facing profile data (no sensitive fields like birth_year, is_admin) */
export interface PublicProfile {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: string | null;
  current_mood: string | null;
  current_music: string | null;
  created_at: string;
}

/** Public post (truncated content, reactions, no user_reactions) */
export interface PublicPost {
  id: string;
  title: string;
  content: string;
  author: string;
  chapter: string | null;
  mood: string | null;
  music: string | null;
  is_private: boolean;
  created_at: string;
  content_truncated: boolean;
  reactions: Record<string, number>;
}

/** Shape returned by get_public_profile RPC */
export interface PublicProfileData {
  profile: PublicProfile;
  posts: PublicPost[];
}

// L8 FIX: Removed unused UserStats, UpdateProfileInput, SignupData interfaces
// — nothing imports them. If needed later, re-create here.
