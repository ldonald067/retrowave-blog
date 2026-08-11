/**
 * Pure auth action functions — thin wrappers over supabase.auth.* that return
 * user-safe results. They hold NO state and set up NO subscriptions, so form
 * components can call them without instantiating the stateful useAuth hook
 * (which each spins up its own onAuthStateChange subscription + profile fetch).
 * The single stateful useAuth in App.tsx owns auth-state and reacts to the
 * SIGNED_IN / SIGNED_OUT events these actions trigger.
 */
import { supabase } from './supabase';
import { toUserMessage } from './errors';
import { authRedirectTo } from './auth-callback';

/** Passwordless magic-link sign-up (creates the user if absent). */
export async function signUpMagicLink(
  email: string,
  birthYear: number,
  tosAccepted: boolean
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: authRedirectTo(),
        data: { birth_year: birthYear, tos_accepted: tosAccepted },
      },
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/** Password-based sign-up. */
export async function signUpWithPassword(
  email: string,
  password: string,
  birthYear: number,
  tosAccepted: boolean
): Promise<{ error: string | null; needsConfirmation?: boolean; alreadyRegistered?: boolean }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Without this the confirmation link falls back to the project's Site
        // URL, so an iOS signup was confirmed in Safari and the app never saw
        // the session. See authRedirectTo.
        emailRedirectTo: authRedirectTo(),
        data: { birth_year: birthYear, tos_accepted: tosAccepted },
      },
    });
    if (error) throw error;
    // With confirmations on, an existing email returns success with an
    // obfuscated user (empty identities) and no email sent. Detect it.
    const alreadyRegistered =
      !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    return { error: null, needsConfirmation: !data.session, alreadyRegistered };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/** Passwordless magic-link sign-in (existing users only). */
export async function signInMagicLink(email: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: authRedirectTo() },
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/** Password-based sign-in. */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}
