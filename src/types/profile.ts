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

export interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  theme?: string;
  current_mood?: string;
  current_music?: string;
}

export interface SignupData {
  email: string;
  birth_year: number;
  tos_accepted: boolean;
  display_name?: string;
}

// L8 FIX: Removed unused UserStats interface — nothing imports it.
// If a stats feature is added later, re-create it here.
