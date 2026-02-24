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
  [/jwt expired/i, 'Your session has expired. Please sign in again.'],
  [/invalid jwt/i, 'Your session is invalid. Please sign in again.'],
  [/rate limit/i, 'Too many requests. Please wait a moment and try again.'],
  [/network/i, 'Network error. Please check your connection.'],
  [/failed to fetch/i, 'Could not reach the server. Please check your connection.'],
  [/row-level security/i, 'You do not have permission to perform this action.'],
  [/violates.*constraint/i, 'The data you submitted does not meet requirements.'],
  // L1 FIX: Previous message leaked that the backend uses a relational database.
  [/relation.*does not exist/i, 'Something went wrong. Please contact support.'],
  [/anonymous sign-ins are disabled/i, 'Anonymous sign-ins are disabled. Enable them in your Supabase project settings.'],
];

const FALLBACK = 'Something went wrong. Please try again.';

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

  if (typeof err === 'string') return classifyMessage(err);

  if (err instanceof Error) return classifyMessage(err.message);

  const supaErr = err as SupabaseError;
  if (supaErr.code) {
    const mapped = POSTGREST_CODES[supaErr.code];
    if (mapped) return mapped;
  }
  if (supaErr.message) return classifyMessage(supaErr.message);

  return FALLBACK;
}
