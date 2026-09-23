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
  tosAccepted: boolean,
  username?: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: authRedirectTo(),
        data: { birth_year: birthYear, tos_accepted: tosAccepted, username },
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
  tosAccepted: boolean,
  username?: string
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
        // handle_new_user reads `username` from this metadata; without it, it
        // falls back to the email's local part — the old behaviour.
        data: { birth_year: birthYear, tos_accepted: tosAccepted, username },
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

/**
 * Sends the sign-up confirmation email again.
 *
 * Confirmation links expire after an hour (prod `mailer_otp_exp` 3600), and
 * before this existed the only way to get a fresh one was to sign up again —
 * signing in just said "verify your email" and stopped.
 *
 * Supabase allows one email per address every 60 seconds and refuses sooner
 * requests with "you can only request this after N seconds". That wait comes
 * back as `retryAfterSeconds` so the button can count it down instead of
 * failing again.
 */
export async function resendConfirmation(
  email: string
): Promise<{ error: string | null; retryAfterSeconds?: number }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authRedirectTo() },
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    const raw = err instanceof Error ? err.message : '';
    const wait = /after (\d+) seconds?/i.exec(raw);
    if (wait) {
      const seconds = Number(wait[1]);
      return {
        error: `Please wait ${seconds} seconds before asking for another email.`,
        retryAfterSeconds: seconds,
      };
    }
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

/**
 * Sends the "reset your password" email.
 *
 * Deliberately reports success even when the address has no account. Saying
 * "no account with that email" here would turn this form into a way to test who
 * has an account, which is the same reason Supabase will not reveal it at
 * signup. `resetPasswordForEmail` behaves that way already; this just does not
 * undo it.
 */
export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectTo(),
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/**
 * Sets a new password for the session the recovery link established.
 *
 * Only works while that session is live — the recovery token is what authorises
 * the change, so this must be called from the screen the callback opens rather
 * than saved for later.
 */
export async function updatePassword(password: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.updateUser({ password });
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
