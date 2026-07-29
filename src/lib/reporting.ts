import { BLOG_OWNER_EMAIL } from './constants';
import { supabase } from './supabase';
import { toUserMessage } from './errors';
import { withRetry } from './retry';

/** Report categories shown to the user. Must match the DB check constraint. */
export const REPORT_REASONS = [
  { value: 'harassment', label: 'harassment or bullying' },
  { value: 'adult', label: 'adult or sexual content' },
  { value: 'violence', label: 'violence or self-harm' },
  { value: 'spam', label: 'spam or scam' },
  { value: 'other', label: 'something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

/**
 * Files a report against a public entry.
 *
 * This used to be a `mailto:` link, which silently did nothing on any device
 * without a configured Mail account — no record, no confirmation. It now writes
 * a durable row via a SECURITY DEFINER RPC that works for signed-out visitors
 * too, so the report always lands somewhere the operator can act on.
 */
export async function reportPublicPost(
  postId: string,
  reason: ReportReason,
  details?: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await withRetry(async () =>
      supabase.rpc('report_public_post', {
        p_post_id: postId,
        p_reason: reason,
        p_details: details?.trim() ? details.trim() : null,
      })
    );
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/**
 * Blocks the owner of a public page by username.
 *
 * The public profile RPC deliberately withholds the owner's user id, so the
 * username is resolved server-side. Requires an account — callers should send
 * signed-out users to sign-up instead.
 */
export async function blockUserByUsername(username: string): Promise<{ error: string | null }> {
  try {
    const { error } = await withRetry(async () =>
      supabase.rpc('block_user_by_username', { p_username: username })
    );
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/** Secondary contact path, offered alongside (never instead of) in-app reporting. */
export function buildReportEmailHref(subject: string, body?: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${BLOG_OWNER_EMAIL}?${params.join('&')}`;
}
