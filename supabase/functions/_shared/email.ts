/**
 * The one email design. Every message the product sends is rendered here:
 * the Supabase auth templates (supabase/templates/build.mjs imports this file —
 * Node 24 runs .ts directly), the account-deletion confirmation, and the report
 * notification. Change the look here and every email follows.
 *
 * It is the app's classic-xanga theme, because that is the theme every new
 * user sees first (a signed-out user has no theme). Colours are the literal
 * values from src/lib/themes.ts — an email cannot resolve CSS variables — and
 * the same pairings the app verified for contrast: --text-title on the header
 * gradient (4.77:1), --accent-primary and --text-body on white.
 *
 * Email HTML is not web HTML. Gmail and Outlook drop flexbox, grid, <style>
 * blocks and web fonts, so this is tables and inline styles. box-shadow is
 * decoration that may silently vanish — nothing depends on it.
 *
 * NO TEXT ON A GRADIENT. Gmail's dark mode inverts solid colours — light
 * backgrounds go dark and dark text goes light — but leaves background-image
 * alone. Text sitting on a gradient therefore gets flipped while its backdrop
 * does not: on 2026-09-18 the wordmark went pale pink on the pastel header and
 * the button label went dark on the pink button, both near-invisible. Every
 * gradient here is decoration with nothing written on it; all text sits on a
 * solid colour, which Gmail flips together with the text.
 *
 * Voice, as in the app (/frontend): u, ur, 2, tildes on actions, sparkles on
 * headings. Two places stay plain on purpose: subjects (a subject full of
 * tildes is what makes a real email look forged) and the line that explains
 * why someone got the email, which is what lets a person who did not ask for it
 * safely ignore it instead of reporting it as phishing.
 *
 * Only erasable TypeScript here — no enums, no namespaces — so Node's type
 * stripping and Deno both run it as is.
 */

export const BRAND = {
  name: 'Retrowave Journal',
  site: 'https://retrowaveblog.com',
  support: 'support@retrowaveblog.com',
  // --bg-gradient-*
  pageFrom: '#ffe4ec',
  pageVia: '#f3e8ff',
  pageTo: '#e8f4ff',
  // --header-gradient-*
  headerFrom: '#ffb6c1',
  headerVia: '#dda0dd',
  headerTo: '#add8e6',
  title: '#7d1a4d', // --text-title
  subtitle: '#6d1b96', // --text-subtitle
  body: '#333333', // --text-body
  muted: '#444444', // --text-muted
  accent: '#d6157e', // --accent-primary
  border: '#ff99cc', // --border-primary
  shadow: '#ffb3d9', // --shadow-color
  buttonFrom: '#cc3388', // --button-gradient-from
  buttonTo: '#aa2266', // --button-gradient-to
  card: '#ffffff', // --card-bg
  caution: '#b45309', // --link-caution
} as const;

const TITLE_FONT = "'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', 'Trebuchet MS', cursive";
const BODY_FONT = "Verdana, Tahoma, 'Segoe UI', sans-serif";

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Keeps a tilde on the same line as the word beside it, so a wrapped heading or
 * button never strands a lone "~" on its own line.
 */
export function glueTildes(text: string): string {
  return text.replace(/~ /g, '~&nbsp;').replace(/ ~/g, '&nbsp;~');
}

/** A paragraph in the body style. `html` is trusted markup — escape inputs first. */
export function p(html: string, spacing = '0 0 12px'): string {
  return `<p style="margin:${spacing};font-family:${BODY_FONT};font-size:15px;line-height:1.55;color:${BRAND.body};">${html}</p>`;
}

/** A tinted callout box, e.g. "3 reports have been filed". */
export function callout(html: string, tone: 'pink' | 'amber' | 'purple' = 'pink'): string {
  const edge = tone === 'amber' ? BRAND.caution : tone === 'purple' ? BRAND.subtitle : BRAND.accent;
  const fill = tone === 'amber' ? '#fff4e5' : tone === 'purple' ? '#f5ecff' : '#fff0f5';
  return `<div style="margin:0 0 14px;padding:10px 14px;background:${fill};border-left:4px solid ${edge};border-radius:6px;font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:${BRAND.body};">${html}</div>`;
}

export interface EmailOptions {
  /** The inbox preview line. Unset, clients scrape the first text they find. */
  preheader: string;
  /** Voice allowed — rendered between sparkles. */
  heading: string;
  /** Trusted HTML built with p()/callout(); escape anything user-supplied. */
  body: string;
  /** Optional button. Omit for pure notifications, which read less like phishing without one. */
  cta?: { href: string; label: string; showRawLink?: boolean };
  /** Plain English: why this arrived, and what to do if it was not you. */
  footNote: string;
  /** Sign-off line above the footer. */
  signOff?: string;
}

/**
 * The full message: a pink page, a gradient header band framing a solid
 * wordmark sticker, a dotted .xanga-box card with a pink drop shadow, a solid
 * .xanga-button CTA, and a footer.
 */
export function renderEmail({
  preheader,
  heading,
  body,
  cta,
  footNote,
  signOff = '&#10024; thanks 4 being here &#10024;',
}: EmailOptions): string {
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto 8px;">
          <tr>
            <td bgcolor="${BRAND.buttonFrom}" style="background:${BRAND.buttonFrom};border:2px solid ${BRAND.border};border-radius:12px;box-shadow:3px 3px 0 ${BRAND.shadow};">
              <a href="${cta.href}" style="display:inline-block;padding:12px 24px;font-family:${TITLE_FONT};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;white-space:nowrap;">${glueTildes(cta.label)}</a>
            </td>
          </tr>
        </table>${
          cta.showRawLink === false
            ? ''
            : `
        <p style="margin:12px 0 2px;font-family:${BODY_FONT};font-size:11px;color:${BRAND.muted};text-align:center;">button not working? copy this link:</p>
        <p style="margin:0 0 4px;font-family:${BODY_FONT};font-size:10px;line-height:1.4;word-break:break-all;text-align:center;"><a href="${cta.href}" style="color:${BRAND.accent};">${cta.href}</a></p>`
        }`
    : '';

  return `<div style="margin:0;padding:0;background:${BRAND.pageFrom};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${BRAND.pageFrom}" style="background:${BRAND.pageFrom};">
    <tr>
      <td align="center" style="padding:20px 10px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:540px;">
          <tr>
            <td align="center" style="padding:0 0 10px;font-family:${TITLE_FONT};font-size:14px;letter-spacing:6px;color:${BRAND.accent};">&#10022; &#9825; &#10022; &#9825; &#10022;</td>
          </tr>
          <tr>
            <td align="center" bgcolor="${BRAND.headerVia}" style="background:${BRAND.headerVia};background-image:linear-gradient(90deg,${BRAND.headerFrom},${BRAND.headerVia},${BRAND.headerTo});border:3px dotted ${BRAND.border};border-bottom:none;border-radius:16px 16px 0 0;padding:14px 14px;">
              <!-- The gradient is the frame; the words sit on a solid sticker so
                   Gmail's dark mode flips text and backdrop together. -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td align="center" bgcolor="${BRAND.card}" style="background:${BRAND.card};border:2px solid ${BRAND.border};border-radius:14px;padding:8px 18px 7px;">
                    <span style="font-family:${TITLE_FONT};font-size:19px;font-weight:bold;color:${BRAND.title};white-space:nowrap;">&#10024;&nbsp;${BRAND.name}&nbsp;&#10024;</span>
                    <div style="margin-top:2px;font-family:${BODY_FONT};font-size:11px;color:${BRAND.subtitle};white-space:nowrap;">ur private corner of 2005</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="${BRAND.card}" style="background:${BRAND.card};border:3px dotted ${BRAND.border};border-radius:0 0 16px 16px;padding:22px 20px 18px;box-shadow:6px 6px 0 ${BRAND.shadow};">
              <h1 style="margin:0 0 14px;font-family:${TITLE_FONT};font-size:21px;line-height:1.3;color:${BRAND.accent};text-align:center;"><span style="color:${BRAND.border};">&#10022;</span>&nbsp;${glueTildes(heading)}&nbsp;<span style="color:${BRAND.border};">&#10022;</span></h1>
              ${body}
              ${button}
              <div style="margin:18px 0 12px;border-top:2px dotted ${BRAND.border};line-height:0;font-size:0;">&nbsp;</div>
              <p style="margin:0;font-family:${BODY_FONT};font-size:12px;line-height:1.55;color:${BRAND.muted};">${footNote}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 8px 0;">
              <p style="margin:0 0 6px;font-family:${TITLE_FONT};font-size:15px;color:${BRAND.subtitle};">${signOff}</p>
              <p style="margin:0;font-family:${BODY_FONT};font-size:12px;color:${BRAND.muted};">
                <a href="${BRAND.site}" style="color:${BRAND.accent};">retrowaveblog.com</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:${BRAND.support}" style="color:${BRAND.accent};">${BRAND.support}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`;
}
