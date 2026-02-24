// Supabase type definitions

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface DatabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// L8 FIX: Removed unused SupabaseResponse<T> — nothing imports it.
// If needed in the future, re-add it here.
