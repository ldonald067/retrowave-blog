// Supabase Edge Function — emails the operator when a content report is filed.
//
// Deploy with: supabase functions deploy notify-report
// Set secret:  supabase secrets set RESEND_API_KEY=re_xxx
//
// Triggered by a Database Webhook on INSERT into public.content_reports
// (Dashboard → Database → Webhooks, type "Supabase Edge Functions").
//
// WHY THIS EXISTS
// content_reports has RLS enabled with no policies, so the queue is invisible
// to the API by design and only reachable via the dashboard. For a solo
// operator that means reports would sit unread indefinitely — and App Review
// Guideline 1.2 asks not just that reporting exists but that reports get a
// timely response. This turns the durable row into an actual signal.
//
// The email carries the reported title, an excerpt, the author's @username and
// how many times the entry has been reported, because a mail containing only
// UUIDs cannot be triaged — it can only start an investigation. Most reports
// are resolved by reading rather than acting, and this makes that possible from
// the phone.
//
// FAIL-SOFT: the report row is already committed before this runs. If the email
// fails we log and still return 200, because a webhook retry storm must never
// be able to affect the reporting path the user sees. The row remains the
// source of truth; the email is a convenience layer on top of it. Enrichment is
// fail-soft within that — if the lookups fail the mail still goes out, just
// thinner.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://retrowaveblog.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const TO_EMAIL = 'support@retrowaveblog.com';
// Resend requires a verified sending domain — retrowaveblog.com is already
// verified there for the auth emails.
const FROM_EMAIL = 'Retrowave Journal <support@retrowaveblog.com>';
// Opens the in-app moderation screen. The link carries only the report id and
// no authority of its own: the screen is gated on is_admin(), so a leaked or
// prefetched URL grants nothing. That is why this is a deep link rather than
// the usual signed action-link pattern.
const APP_SCHEME = 'com.retrowave.journal://open';

const EXCERPT_LIMIT = 600;

const REASON_LABELS: Record<string, string> = {
  harassment: 'Harassment or bullying',
  adult: 'Adult or sexual content',
  violence: 'Violence or self-harm',
  spam: 'Spam or scam',
  other: 'Something else',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function restGet(path: string): Promise<Record<string, unknown>[]> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) {
    console.error('notify-report: lookup failed', path, res.status);
    return [];
  }
  return (await res.json()) as Record<string, unknown>[];
}

interface ReportContext {
  title?: string;
  excerpt?: string;
  isPrivate?: boolean;
  authorUsername?: string;
  reporterUsername?: string;
  reportCount?: number;
}

/** Everything needed to judge the report without opening the dashboard. */
async function loadContext(row: Record<string, unknown>): Promise<ReportContext> {
  const ctx: ReportContext = {};
  try {
    const [posts, authors, reporters, reports] = await Promise.all([
      restGet(`posts?id=eq.${row.post_id}&select=title,content,is_private`),
      restGet(`profiles?id=eq.${row.reported_user_id}&select=username`),
      row.reporter_id
        ? restGet(`profiles?id=eq.${row.reporter_id}&select=username`)
        : Promise.resolve([]),
      restGet(`content_reports?post_id=eq.${row.post_id}&select=id`),
    ]);

    const post = posts[0];
    if (post) {
      ctx.title = String(post.title ?? '');
      const content = String(post.content ?? '');
      ctx.excerpt =
        content.length > EXCERPT_LIMIT ? `${content.slice(0, EXCERPT_LIMIT)}…` : content;
      ctx.isPrivate = Boolean(post.is_private);
    }
    if (authors[0]) ctx.authorUsername = String(authors[0].username ?? '');
    if (reporters[0]) ctx.reporterUsername = String(reporters[0].username ?? '');
    if (reports.length) ctx.reportCount = reports.length;
  } catch (err) {
    console.error('notify-report: context lookup failed, sending thin email', err);
  }
  return ctx;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    // Supabase Database Webhooks send { type, table, record, old_record, schema }
    const row = payload?.record;
    if (!row?.id) {
      console.warn('notify-report: no record in payload', JSON.stringify(payload).slice(0, 200));
      return new Response(JSON.stringify({ ok: true, skipped: 'no record' }), { status: 200 });
    }

    if (!RESEND_API_KEY) {
      // Deliberately not an error response: the report is already saved, and
      // failing loudly here would just make the webhook retry forever.
      console.error('notify-report: RESEND_API_KEY not set — report saved but no email sent');
      return new Response(JSON.stringify({ ok: true, emailed: false }), { status: 200 });
    }

    const ctx = await loadContext(row);
    const reason = REASON_LABELS[row.reason] ?? row.reason;
    const reporter = ctx.reporterUsername
      ? `@${ctx.reporterUsername}`
      : row.reporter_id
        ? 'signed in'
        : 'anonymous visitor';
    const author = ctx.authorUsername ? `@${ctx.authorUsername}` : String(row.reported_user_id);
    const repeat =
      ctx.reportCount && ctx.reportCount > 1
        ? `<p style="margin:12px 0;padding:8px 12px;background:#fff4e5;border-left:3px solid #e08600">
             <strong>${ctx.reportCount} reports</strong> have been filed against this entry.</p>`
        : '';
    const alreadyPrivate = ctx.isPrivate
      ? `<p style="margin:12px 0;padding:8px 12px;background:#eef7ee;border-left:3px solid #4c9a4c">
           This entry is already private — it is not publicly visible.</p>`
      : '';

    const subjectTitle = ctx.title
      ? `“${ctx.title.slice(0, 60)}”`
      : `entry ${String(row.post_id).slice(0, 8)}`;

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5">
        <h2 style="margin:0 0 4px">${escapeHtml(reason)}</h2>
        <p style="margin:0 0 16px;color:#666">reported by ${escapeHtml(reporter)} · ${escapeHtml(row.created_at)}</p>

        ${repeat}
        ${alreadyPrivate}

        <div style="border:1px solid #ddd;border-radius:8px;padding:12px 16px;margin:16px 0">
          <p style="margin:0 0 6px;color:#666;font-size:12px">ENTRY BY ${escapeHtml(author)}</p>
          <p style="margin:0 0 10px;font-size:16px;font-weight:bold">${escapeHtml(ctx.title ?? '(no title)')}</p>
          <div style="white-space:pre-wrap;color:#222">${escapeHtml(ctx.excerpt ?? '(content unavailable)')}</div>
        </div>

        ${
          row.details
            ? `<p style="margin:16px 0 4px"><strong>Reporter's note</strong></p>
               <blockquote style="margin:0;padding:8px 12px;border-left:3px solid #ccc;white-space:pre-wrap">${escapeHtml(row.details)}</blockquote>`
            : ''
        }

        <p style="margin:24px 0 8px">
          <a href="${APP_SCHEME}#/report/${escapeHtml(row.id)}"
             style="display:inline-block;background:#cc3388;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">
            Review in app
          </a>
        </p>
        <p style="color:#666;font-size:12px;margin:4px 0 20px">
          Opens the moderation screen. You must be signed in as an admin — the link grants nothing on its own.
        </p>

        <details style="color:#666;font-size:12px">
          <summary>Do it in SQL instead</summary>
          <pre style="background:#f6f6f6;padding:10px;border-radius:6px;overflow-x:auto">-- hide the entry
update posts set is_private = true where id = '${escapeHtml(row.post_id)}';
-- mark this report handled
update content_reports set status = 'actioned' where id = '${escapeHtml(row.id)}';</pre>
        </details>
        <p style="color:#666;font-size:12px">${escapeHtml(SITE_URL)}</p>
      </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: `[report] ${reason} — ${subjectTitle}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error('notify-report: resend failed', res.status, (await res.text()).slice(0, 300));
      return new Response(JSON.stringify({ ok: true, emailed: false }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true, emailed: true }), { status: 200 });
  } catch (err) {
    console.error('notify-report: unexpected error', err);
    return new Response(JSON.stringify({ ok: true, emailed: false }), { status: 200 });
  }
});
