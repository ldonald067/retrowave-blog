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
  created_at: string;
  updated_at: string;
}

// L8 FIX: Removed unused UserStats, UpdateProfileInput, SignupData interfaces
// — nothing imports them. If needed later, re-create here.
