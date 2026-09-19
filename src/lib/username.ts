import { supabase } from './supabase';

/**
 * Whether a (normalized) username is free. `null` means the check itself
 * failed — callers treat that as "go ahead": the database's unique index is
 * the real guard, and sign-up's trigger falls back to a suffixed name rather
 * than failing.
 *
 * Callable before sign-in, so it tells anyone whether a username exists. That
 * is inherent to a public @handle and is all it reveals — a boolean, from a
 * SECURITY DEFINER function, never the row.
 */
export async function isUsernameAvailable(username: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.rpc('is_username_available', {
      p_username: username,
    });
    if (error) return null;
    return data === true;
  } catch {
    return null;
  }
}
