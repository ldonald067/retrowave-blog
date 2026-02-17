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

export interface SupabaseResponse<T> {
  data: T | null;
  error: DatabaseError | null;
}
