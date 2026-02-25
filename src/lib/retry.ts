/**
 * Retry utility with exponential backoff and jitter.
 * Only retries on transient errors (network, timeout), not on
 * auth/permission/constraint errors.
 *
 * USAGE:
 *   import { withRetry } from '../lib/retry';
 *   const result = await withRetry(() => supabase.from('posts').select('*'));
 */

import { POSTGREST_CODES } from './errors';

interface RetryOptions {
  maxAttempts?: number; // default 3
  baseDelayMs?: number; // default 300
  maxDelayMs?: number; // default 5000
}

/** Postgres/PostgREST error codes that should NOT be retried (derived from errors.ts) */
const NON_RETRYABLE_CODES = new Set(Object.keys(POSTGREST_CODES));

function isRetryable(err: unknown): boolean {
  if (!err) return false;
  const supaErr = err as {
    code?: string;
    message?: string;
    status?: number;
  };
  if (supaErr.code && NON_RETRYABLE_CODES.has(supaErr.code)) return false;
  if (supaErr.message?.match(/permission|unauthorized|jwt|rls/i)) return false;
  // L2 FIX: Don't retry rate-limited responses — retrying deepens the
  // rate limit hole, especially on flaky mobile connections where
  // bursts of retried requests compound the problem.
  if (supaErr.status === 429) return false;
  if (supaErr.message?.match(/rate.?limit|too many/i)) return false;
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes `fn` up to `maxAttempts` times with exponential backoff.
 * Throws the last error if all attempts fail.
 *
 * Works with Supabase queries that return `{ data, error }` — if the
 * result has an error property and the error is retryable, it throws
 * to trigger a retry. Non-retryable errors are returned as-is.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 300, maxDelayMs = 5000 } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      // Handle Supabase's { data, error } pattern
      const asObj = result as { error?: unknown };
      if (asObj?.error) {
        if (!isRetryable(asObj.error) || attempt === maxAttempts) {
          return result; // Return as-is, let the caller handle the error
        }
        lastError = asObj.error;
        // Fall through to retry delay
      } else {
        return result;
      }
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === maxAttempts) throw err;
    }

    // Exponential backoff with ±20% jitter
    const exponential = baseDelayMs * 2 ** (attempt - 1);
    const capped = Math.min(exponential, maxDelayMs);
    const jittered = capped * (0.8 + Math.random() * 0.4);
    await delay(jittered);
  }

  throw lastError;
}
