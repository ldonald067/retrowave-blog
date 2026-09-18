// Supabase Edge Function: delete the caller's account, then email them.
// Deploy with: supabase functions deploy delete-account   (JWT verification ON)
// Needs the RESEND_API_KEY secret, which notify-report already uses.
//
// WHY THIS IS A FUNCTION AND NOT A DATABASE TRIGGER
// A trigger on auth.users could send the email, but it would have to reach an
// endpoint that takes the recipient from its payload — and anything callable
// with the public anon key that emails an arbitrary address is a relay: anyone
// could make retrowaveblog.com send "your account was deleted" to a stranger.
// Here the recipient is never an input. It is read from the caller's own
// verified session, so the only address this can ever email is the address of
// the person deleting their own account.
//
// ORDER IS THE POINT
// 1. Read the caller's email and username while they still exist.
// 2. Delete through delete_user_account(), the same one-transaction RPC the app
//    used before (verified 2026-09-18). It runs with the caller's JWT, so
//    auth.uid() is theirs and nothing here needs the service role.
// 3. Only if that succeeded, send the email. A failed deletion must never
//    produce a "your account was deleted" message.
// The email is fail-soft: once the data is gone, a Resend outage must not turn
// a completed deletion into an error. The response says whether it was sent.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderEmail, p, escapeHtml, BRAND } from '../_shared/email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://retrowaveblog.com';
const WWW_ORIGIN = SITE_URL.replace('https://', 'https://www.');
const FROM_EMAIL = 'Retrowave Journal <support@retrowaveblog.com>';
const SUPPORT_EMAIL = 'support@retrowaveblog.com';

// capacitor://localhost is the iOS app's own origin. Without it the web view
// blocks the response and the app could not delete accounts at all.
const ALLOWED_ORIGINS = [
  SITE_URL,
  WWW_ORIGIN,
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:5174',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, origin: string | null, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

async function sendDeletionEmail(to: string, username: string | null): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('delete-account: RESEND_API_KEY not set — account deleted, no email sent');
    return false;
  }

  const when = new Date().toUTCString();
  const who = username ? ` (<strong>@${escapeHtml(username)}</strong>)` : '';
  const html = renderEmail({
    preheader: 'Your journal and everything in it has been permanently deleted.',
    heading: '~ farewell friend ~',
    body:
      p(`ur ${BRAND.name} account${who} was permanently deleted on ${escapeHtml(when)}.`) +
      p('that includes every entry, ur profile, ur reactions and ur block list. it can&rsquo;t be undone, and there&rsquo;s nothing else u need 2 do.') +
      p('thanks 4 writing with us &#9825; ur always welcome back.', '0'),
    footNote: `You&rsquo;re getting this because the account for this address was deleted from inside the app. If you didn&rsquo;t ask for this, reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.accent};">${SUPPORT_EMAIL}</a>.`,
    signOff: '&#10024; xoxo, Retrowave Journal &#10024;',
  });
  const text = [
    '~ farewell friend ~',
    '',
    `Your ${BRAND.name} account${username ? ` (@${username})` : ''} was permanently deleted on ${when}.`,
    '',
    "That includes every entry, your profile, your reactions and your block list. It can't be undone, and there's nothing else you need to do.",
    '',
    `If you didn't ask for this, reply to this email or write to ${SUPPORT_EMAIL}.`,
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        reply_to: SUPPORT_EMAIL,
        subject: 'Your Retrowave Journal account was deleted',
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error('delete-account: Resend rejected the email', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('delete-account: Resend request failed', err);
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, origin, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing or invalid Authorization header' }, origin, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    console.error('delete-account: missing SUPABASE_URL or SUPABASE_ANON_KEY');
    return json({ error: 'Server misconfiguration' }, origin, 500);
  }

  // The caller's own client: every query below runs as them, under RLS.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, origin, 401);

  // Captured before deletion — afterwards there is no one to look up.
  const email = user.email ?? null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();
  const username = (profile?.username as string | undefined) ?? null;

  const { error: deleteError } = await supabase.rpc('delete_user_account');
  if (deleteError) {
    console.error('delete-account: deletion failed', deleteError.code, deleteError.message);
    return json({ deleted: false }, origin, 500);
  }

  const emailed = email ? await sendDeletionEmail(email, username) : false;
  return json({ deleted: true, emailed }, origin);
});
