/**
 * Builds the Supabase auth email templates.
 *
 * These live in the dashboard, which makes them invisible to the repo and
 * impossible to review — the same drift trap CLAUDE.md describes for
 * migrations. The source of truth is here; the dashboard gets a copy.
 *
 *   node supabase/templates/build.mjs          # render to ./out
 *   node supabase/templates/build.mjs --push   # render, then PATCH Supabase
 *
 * Email HTML is not web HTML. No flexbox, no grid, no CSS variables, no web
 * fonts, no <style> block worth relying on — Gmail strips or mangles all of it.
 * Everything below is tables and inline styles on purpose.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');

// The design lives in ../functions/_shared/email.ts so the auth emails and the
// ones edge functions send (account deletion, report notifications) cannot
// drift apart. Node 24 imports the .ts file directly.
import { renderEmail, p, BRAND } from '../functions/_shared/email.ts';

/**
 * The reason-you-got-this line. Saying it plainly is the cheapest way to look
 * legitimate, and it is what tells someone who did NOT sign up that they can
 * safely ignore the mail rather than reporting it as phishing.
 */
const IGNORE = (what) =>
  `You&rsquo;re getting this because someone used this address to ${what} on ${BRAND.name}. If that wasn&rsquo;t you, just ignore this email &mdash; nothing will happen without the link above.`;

/** For notifications about something that already happened: there is no link to not tap. */
const NOT_YOU = (what) =>
  `You&rsquo;re getting this because ${what} on your ${BRAND.name} account. If that wasn&rsquo;t you, reset your password from the sign-in screen right away and write to <a href="mailto:${BRAND.support}" style="color:${BRAND.accent};">${BRAND.support}</a>.`;

const URL = '{{ .ConfirmationURL }}';

// Subjects stay plain and name the product. The voice lives in the body; a
// subject full of tildes is what makes a real email look forged.
export const TEMPLATES = {
  confirmation: {
    subject: `Confirm your email — ${BRAND.name}`,
    html: renderEmail({
      preheader: 'One tap and your journal is ready.',
      heading: '~ welcome 2 ur new journal ~',
      body:
        p('hi! ur almost in &#9825;') +
        // {{ .Data }} is the RAW sign-up metadata — anyone with the anon key
        // can set it, and send this email to any address. GoTrue escapes
        // markup but not words, so the handle-shape check lives in
        // hook_before_user_created (finding 72). The length guard here is the
        // backstop if that hook is ever off: a real handle is at most 30.
        // Nested, not `and`, so len never sees a missing value.
        '{{ if .Data.username }}{{ if le (len .Data.username) 30 }}' +
        p(
          'ur handle is <strong>@{{ .Data.username }}</strong> &#10022; it&rsquo;s what people see on ur public page, not ur email.'
        ) +
        '{{ end }}{{ end }}' +
        p(
          'tap below 2 confirm this email address, and ur journal is ready 4 its very first entry.',
          '0'
        ),
      cta: { href: URL, label: '~ confirm my email ~' },
      footNote: IGNORE('create an account'),
    }),
  },
  magic_link: {
    subject: `Your sign-in link — ${BRAND.name}`,
    html: renderEmail({
      preheader: 'Your one-time sign-in link, good for 60 minutes.',
      heading: '~ welcome back ~',
      body:
        p('here&rsquo;s ur magic link &mdash; no password needed &#10024;') +
        p('it works once, and only 4 the next hour.', '0'),
      cta: { href: URL, label: '~ sign me in ~' },
      footNote: IGNORE('sign in'),
    }),
  },
  // Restored once the flow it promises actually existed: requestPasswordReset
  // sends this, consumeAuthCallback recognises `type=recovery` rather than
  // treating it as an ordinary sign-in, and NewPasswordModal spends the session
  // the link establishes on updateUser({ password }).
  recovery: {
    subject: `Reset your password — ${BRAND.name}`,
    html: renderEmail({
      preheader: 'Reset your password. Link expires in 60 minutes.',
      heading: '~ let&rsquo;s get u back in ~',
      body:
        p('forgot ur password? happens 2 the best of us &#9825;') +
        p('tap below and u can pick a new one right away. the link expires in an hour.', '0'),
      cta: { href: URL, label: '~ reset my password ~' },
      footNote: `You&rsquo;re getting this because someone asked to reset the password for this address on ${BRAND.name}. If that wasn&rsquo;t you, ignore this email &mdash; your password stays exactly as it is.`,
    }),
  },
  email_change: {
    subject: `Confirm your new email — ${BRAND.name}`,
    html: renderEmail({
      preheader: 'Confirm the new address for your account.',
      heading: '~ confirm ur new email ~',
      body:
        p(
          'u asked 2 change the email on ur journal from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.'
        ) + p('tap below 2 confirm the new address.', '0'),
      cta: { href: URL, label: '~ confirm the change ~' },
      footNote: IGNORE('change the email address'),
    }),
  },
  // Both notifications are switched on in the project (mailer_notifications_*),
  // and until 2026-09-18 went out in Supabase's unstyled default HTML.
  password_changed_notification: {
    subject: `Your password was changed — ${BRAND.name}`,
    html: renderEmail({
      preheader: 'The password on your journal was just changed.',
      heading: '~ ur password was changed ~',
      body:
        p('the password 4 ur journal (<strong>{{ .Email }}</strong>) was just changed.') +
        p('if that was u, ur all set &#9825; nothing else 2 do.', '0'),
      footNote: NOT_YOU('the password was changed'),
    }),
  },
  email_changed_notification: {
    subject: `Your email was changed — ${BRAND.name}`,
    html: renderEmail({
      preheader: 'The email address on your journal was changed.',
      heading: '~ ur email was changed ~',
      body:
        p(
          'the email on ur journal changed from <strong>{{ .OldEmail }}</strong> 2 <strong>{{ .Email }}</strong>.'
        ) + p('if that was u, ur all set &#9825;', '0'),
      footNote: NOT_YOU('the email address was changed'),
    }),
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(TEMPLATES)) {
  writeFileSync(join(OUT, `${name}.html`), t.html);
  console.log(`rendered ${name}.html  (subject: ${t.subject})`);
}

if (process.argv.includes('--push')) {
  const token = execFileSync('security', [
    'find-generic-password',
    '-s',
    'Supabase CLI',
    '-a',
    'supabase',
    '-w',
  ])
    .toString()
    .trim();
  const ref = readFileSync(join(HERE, '../.temp/project-ref'), 'utf8').trim();

  // The sender name is the store name too; it said "Retrowave Blog".
  const payload = { smtp_sender_name: BRAND.name };
  for (const [name, t] of Object.entries(TEMPLATES)) {
    payload[`mailer_templates_${name}_content`] = t.html;
    payload[`mailer_subjects_${name}`] = t.subject;
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log(
    res.ok ? `pushed ${Object.keys(TEMPLATES).length} templates` : `FAILED ${res.status}`
  );
  if (!res.ok) {
    console.error((await res.text()).slice(0, 500));
    process.exit(1);
  }
}
