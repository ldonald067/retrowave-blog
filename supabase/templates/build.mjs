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

// classic-xanga, the default theme. Hardcoded rather than imported from
// themes.ts because an email cannot resolve CSS variables.
const C = {
  bg: '#fff0f5',
  card: '#ffffff',
  border: '#ff99cc',
  title: '#e5007c',
  // --accent-primary, the one that clears 4.5:1 on white. Body copy must stay
  // legible even where a client overrides backgrounds.
  accent: '#d6157e',
  body: '#333333',
  muted: '#666666',
  buttonFrom: '#cc3388',
  buttonTo: '#aa2266',
};

const FONT = "'Comic Sans MS', 'Comic Neue', 'Trebuchet MS', sans-serif";
const SITE = 'https://retrowaveblog.com';

/**
 * Shared shell.
 *
 * `preheader` is the grey line inbox lists show next to the subject. Left
 * unset, clients scrape the first text they find, which is how a legitimate
 * email ends up previewing as "View in browser" and reading like spam.
 */
function shell({ preheader, heading, body, cta, ctaLabel, footNote }) {
  return `<div style="background:${C.bg};margin:0;padding:24px 12px;font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;">
    <tr>
      <td style="background:linear-gradient(90deg,${C.buttonFrom},${C.buttonTo});background-color:${C.buttonFrom};border-radius:10px 10px 0 0;padding:16px 20px;text-align:center;">
        <span style="font-family:${FONT};font-size:19px;font-weight:bold;color:#ffffff;">&#10024; Retrowave Blog &#10024;</span>
      </td>
    </tr>
    <tr>
      <td style="background:${C.card};border:2px dotted ${C.border};border-top:none;border-radius:0 0 10px 10px;padding:24px 20px;">
        <h1 style="margin:0 0 12px;font-family:${FONT};font-size:20px;line-height:1.3;color:${C.title};">${heading}</h1>
        <div style="font-family:${FONT};font-size:15px;line-height:1.6;color:${C.body};">${body}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
          <tr>
            <td style="background:linear-gradient(90deg,${C.buttonFrom},${C.buttonTo});background-color:${C.buttonFrom};border-radius:8px;">
              <a href="${cta}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;color:${C.muted};">or paste this into your browser:</p>
        <p style="margin:0 0 20px;font-family:monospace;font-size:12px;word-break:break-all;"><a href="${cta}" style="color:${C.accent};">${cta}</a></p>
        <hr style="border:none;border-top:1px dotted ${C.border};margin:20px 0;" />
        <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted};">${footNote}</p>
        <p style="margin:12px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};">
          <a href="${SITE}" style="color:${C.accent};">retrowaveblog.com</a>
        </p>
      </td>
    </tr>
  </table>
</div>`;
}

/**
 * The reason-you-got-this line. Saying it plainly is the cheapest way to look
 * legitimate, and it is what tells someone who did NOT sign up that they can
 * safely ignore the mail rather than reporting it as phishing.
 */
const IGNORE = (what) =>
  `You&rsquo;re getting this because someone used this address to ${what} on Retrowave Blog. If that wasn&rsquo;t you, just ignore this email &mdash; nothing will happen without the link above.`;

const URL = '{{ .ConfirmationURL }}';

export const TEMPLATES = {
  confirmation: {
    // Subjects stay plain and name the product. The Xanga voice lives in the
    // body; a subject full of tildes is what makes a real email look forged.
    subject: 'Confirm your email — Retrowave Blog',
    html: shell({
      preheader: 'One tap and your journal is ready.',
      heading: '~ welcome 2 ur new journal ~',
      body: `<p style="margin:0;">hi! ur almost in &#9825;</p>
             <p style="margin:12px 0 0;">tap below 2 confirm this email address, and ur journal is ready.</p>`,
      cta: URL,
      ctaLabel: '~ confirm my email ~',
      footNote: IGNORE('create an account'),
    }),
  },
  magic_link: {
    subject: 'Your sign-in link — Retrowave Blog',
    html: shell({
      preheader: 'Your one-time sign-in link, good for 60 minutes.',
      heading: '~ welcome back ~',
      body: `<p style="margin:0;">here&rsquo;s ur magic link &mdash; no password needed.</p>
             <p style="margin:12px 0 0;">it works once, and only for the next hour.</p>`,
      cta: URL,
      ctaLabel: '~ sign me in ~',
      footNote: IGNORE('sign in'),
    }),
  },
  // NO recovery template here, deliberately. There is no password-reset surface
  // in the app: nothing calls resetPasswordForEmail, nothing handles a
  // type=recovery callback, and nothing calls updateUser({ password }). A
  // recovery link would establish an ordinary session and drop the user on the
  // feed, having promised "pick a new one" and then never asking. Branding that
  // email would only make a broken flow look trustworthy. Add it here when the
  // reset screen exists, not before.
  email_change: {
    subject: 'Confirm your new email — Retrowave Blog',
    html: shell({
      preheader: 'Confirm the new address for your account.',
      heading: '~ confirm ur new email ~',
      body: `<p style="margin:0;">u asked 2 change the email on ur journal from
             <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.</p>
             <p style="margin:12px 0 0;">tap below 2 confirm the new address.</p>`,
      cta: URL,
      ctaLabel: '~ confirm the change ~',
      footNote: IGNORE('change the email address'),
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

  const payload = {};
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
