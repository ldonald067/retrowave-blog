import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { authStorage } from './auth-storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

/**
 * `auth` was previously left entirely to defaults, which put the session in
 * `localStorage` — evictable by iOS — and left recovery from an expired token
 * to a refresh timer that iOS suspends while the app is backgrounded. See
 * `auth-storage.ts` and the resume handler in `capacitor.ts`.
 *
 * Only `storage` is overridden. `persistSession`, `autoRefreshToken` and
 * `detectSessionInUrl` keep their defaults, which the auth-callback flow in
 * `auth-callback.ts` already depends on.
 */
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: authStorage ? { storage: authStorage } : {},
});
