/**
 * Error message mapping — converts raw Supabase/PostgREST/GoTrue errors
 * to user-safe messages. No internal schema details are ever exposed.
 *
 * USAGE:
 *   import { toUserMessage } from '../lib/errors';
 *   catch (err) { return { error: toUserMessage(err) }; }
 */

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

// PostgREST error codes → user-safe messages.
// Also used by retry.ts to determine non-retryable errors.
export const POSTGREST_CODES: Record<string, string> = {
  PGRST116: 'The requested record was not found.',
  PGRST301: 'You do not have permission to perform this action.',
  '42501': 'You do not have permission to perform this action.',
  '23505': 'This record already exists.',
  '23503': 'This action references a record that does not exist.',
  '23514': 'The data you submitted does not meet requirements.',
  '22P02': 'Invalid data format.',
};

// GoTrue / Auth message fragments → safe messages
const AUTH_MESSAGE_MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Incorrect email or password.'],
  [/email not confirmed/i, 'Please verify your email before signing in.'],
  [/user already registered/i, 'An account with this email already exists.'],
  [/password should be at least/i, 'Your password is too short.'],
  // Supabase refuses a new password equal to the current one (same_password).
  // It keeps no history beyond that. Without this it read "Something went wrong".
  [
    /different from the old password/i,
    'Your new password must be different from your current one.',
  ],
  [/jwt expired/i, 'Your session has expired. Please sign in again.'],
  [/invalid jwt/i, 'Your session is invalid. Please sign in again.'],
  [/rate limit/i, 'Too many requests. Please wait a moment and try again.'],
  [/network/i, 'Network error. Please check your connection.'],
  [/failed to fetch/i, 'Could not reach the server. Please check your connection.'],
  [/row-level security/i, 'You do not have permission to perform this action.'],
  [/violates.*constraint/i, 'The data you submitted does not meet requirements.'],
  // Deliberately vague — don't leak that the backend is a relational database.
  [/relation.*does not exist/i, 'Something went wrong. Please contact support.'],
  [
    /anonymous sign-ins are disabled/i,
    'Anonymous sign-ins are disabled. Enable them in your Supabase project settings.',
  ],
];

const FALLBACK = 'Something went wrong. Please try again.';

// guard_username_change() raises `username_cooldown:YYYY-MM-DD` as a
// check_violation. Without this it would be mapped by its code alone, to "The
// data you submitted does not meet requirements." — which says nothing about
// the one fact the person needs, the date.
const USERNAME_COOLDOWN_PATTERN = /username_cooldown:(\d{4})-(\d{2})-(\d{2})/;

function usernameCooldownMessage(raw: string): string | null {
  const match = USERNAME_COOLDOWN_PATTERN.exec(raw);
  if (!match) return null;
  // Built from the parts: `new Date('2026-10-20')` is UTC midnight, which reads
  // as the day before in every timezone west of Greenwich.
  const when = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const label = when.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  return `You can change your username again on ${label}.`;
}

function rawMessageOf(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  return (err as SupabaseError)?.message ?? '';
}

function classifyMessage(msg: string): string {
  for (const [pattern, safe] of AUTH_MESSAGE_MAP) {
    if (pattern.test(msg)) return safe;
  }
  return FALLBACK;
}

/**
 * Returns a user-safe error message from any thrown value.
 * Raw Postgres/PostgREST/GoTrue messages are never passed through.
 */
export function toUserMessage(err: unknown): string {
  if (!err) return FALLBACK;

  // Ahead of the code map: this one carries a date that must survive.
  const cooldown = usernameCooldownMessage(rawMessageOf(err));
  if (cooldown) return cooldown;

  let message: string;

  if (typeof err === 'string') {
    message = classifyMessage(err);
  } else if (err instanceof Error) {
    message = classifyMessage(err.message);
  } else {
    const supaErr = err as SupabaseError;
    if (supaErr.code) {
      const mapped = POSTGREST_CODES[supaErr.code];
      message = mapped ?? (supaErr.message ? classifyMessage(supaErr.message) : FALLBACK);
    } else if (supaErr.message) {
      message = classifyMessage(supaErr.message);
    } else {
      message = FALLBACK;
    }
  }

  // Append offline hint for network-flavored errors
  if (
    typeof navigator !== 'undefined' &&
    !navigator.onLine &&
    /network|connection|reach|server/i.test(message)
  ) {
    message += ' You appear to be offline.';
  }

  return message;
}
