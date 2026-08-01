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
// FAIL-SOFT: the report row is already committed before this runs. If the email
// fails we log and still return 200, because a webhook retry storm must never
// be able to affect the reporting path the user sees. The row remains the
// source of truth; the email is a convenience layer on top of it.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://retrowaveblog.com';
const TO_EMAIL = 'support@retrowaveblog.com';
// Resend requires a verified sending domain — retrowaveblog.com is already
// verified there for the auth emails.
const FROM_EMAIL = 'Retrowave Journal <support@retrowaveblog.com>';

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

    const reason = REASON_LABELS[row.reason] ?? row.reason;
    const reporter = row.reporter_id ? `signed in (${row.reporter_id})` : 'anonymous visitor';

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5">
        <h2 style="margin:0 0 12px">New content report</h2>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><strong>Reason</strong></td><td>${escapeHtml(reason)}</td></tr>
          <tr><td><strong>Entry id</strong></td><td><code>${escapeHtml(row.post_id)}</code></td></tr>
          <tr><td><strong>Reported user</strong></td><td><code>${escapeHtml(row.reported_user_id)}</code></td></tr>
          <tr><td><strong>Reported by</strong></td><td>${escapeHtml(reporter)}</td></tr>
          <tr><td><strong>Filed</strong></td><td>${escapeHtml(row.created_at)}</td></tr>
        </table>
        ${
          row.details
            ? `<p style="margin:16px 0 4px"><strong>Reporter's note</strong></p>
               <blockquote style="margin:0;padding:8px 12px;border-left:3px solid #ccc;white-space:pre-wrap">${escapeHtml(row.details)}</blockquote>`
            : ''
        }
        <p style="margin:20px 0 4px"><strong>To review</strong></p>
        <pre style="background:#f6f6f6;padding:10px;border-radius:6px;overflow-x:auto">select p.title, p.content, p.user_id
from posts p where p.id = '${escapeHtml(row.post_id)}';</pre>
        <p style="color:#666">Mark handled:<br>
          <code>update content_reports set status = 'actioned' where id = '${escapeHtml(row.id)}';</code>
        </p>
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
        subject: `[report] ${reason} — entry ${String(row.post_id).slice(0, 8)}`,
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
