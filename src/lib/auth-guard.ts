/**
 * Shared auth guard — eliminates duplicated getSession() + null-check patterns
 * that were copy-pasted across usePosts, useReactions, useBlocks, and App.tsx.
 *
 * USAGE:
 *   const { user, error } = await requireAuth();
 *   if (error) return { error };
 */
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

type AuthResult =
  | { user: User; error: null }
  | { user: null; error: string };

export async function requireAuth(): Promise<AuthResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { user: null, error: 'You must be logged in to do that.' };
  }
  return { user: session.user, error: null };
}
