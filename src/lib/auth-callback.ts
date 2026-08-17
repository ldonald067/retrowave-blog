/**
 * Auth email callbacks — confirmation, magic link, and password recovery.
 *
 * Every one of these links is an https URL to the site, on every platform. See
 * authRedirectTo for why, including on iOS where a deep link seems obviously
 * better and is not.
 *
 * The rest of this module exists for links that DO carry tokens into the app:
 * `initCapacitor` forwards an incoming deep link's fragment to
 * `window.location.hash`, and `consumeAuthCallback` turns that into a session.
 * That path is dormant while emails point at https, and is what a Universal
 * Link will use once Apple enrolment allows one.
 *
 * The reason it cannot simply be left to Supabase: `detectSessionInUrl` (on by
 * default) only reads the URL when the client is constructed. On the web that
 * is enough — the browser navigates to the callback and the client is built
 * afterwards. On native the app is already running when a deep link arrives, so
 * the tokens turn up long after that single check and must be picked up by hand.
 */
import { supabase } from './supabase';
import { isNativePlatform } from './capacitor';
import { SITE_URL } from './constants';

/**
 * Where a confirmation, magic or recovery link should send the user back to.
 *
 * Always an https URL, including on native — and this is the second time that
 * decision has had to be made, so the reasoning is worth keeping.
 *
 * Pointing native links at `com.retrowave.journal://` did put the session
 * straight into the app, but only when the email was opened *on the phone
 * running it*. Opened anywhere else — a laptop, which is where most people read
 * email — the browser is handed a scheme it cannot resolve and the link does
 * nothing at all. Not an error, not a fallback: a blank page. It cost a signup
 * confirmation and then a password reset before it was taken seriously.
 *
 * An https link degrades instead of dying: it works in any browser on any
 * device, and the person finishes on the website and signs into the app after.
 * Less magical, never dead. Universal Links are the real answer — the same
 * https URL opening the app when it is installed — and they build on this
 * rather than replacing it, but they need an Associated Domains entitlement and
 * an apple-app-site-association file, both blocked on Apple enrolment.
 *
 * `consumeAuthCallback` still handles token-bearing deep links, since that is
 * exactly what a Universal Link will deliver once it exists.
 *
 * Web uses the live origin so localhost stays on localhost during development;
 * note the allow-list holds only `https://retrowaveblog.com/**` and the app
 * scheme, so a local signup still redirects to production until the dev origin
 * is added to it.
 */
export function authRedirectTo(): string {
  return isNativePlatform ? SITE_URL : window.location.origin;
}

/** `none` means the hash was an ordinary route, not a callback. */
export type AuthCallbackResult =
  | { status: 'none' }
  | { status: 'signed-in' }
  | { status: 'recovery' }
  | { status: 'error'; message: string };

/** Event carrying a failed callback to whatever is rendering the UI. */
export const AUTH_CALLBACK_ERROR = 'auth-callback-error';

/** Event announcing that a recovery link opened and a new password is due. */
export const AUTH_PASSWORD_RECOVERY = 'auth-password-recovery';

/**
 * A link that cannot be spent again is the common case here, not an anomaly:
 * confirmation links are single-use and time-limited, so the second tap on one
 * is ordinary user behaviour and deserves an explanation rather than silence.
 */
const EXPIRED = 'that link has expired or was already used ~ request a fresh one';
const FAILED = 'could not finish signing u in ~ please try again';

/**
 * Strip the callback out of the URL.
 *
 * Runs on success AND on every failure. Tokens are bearer credentials: leaving
 * them in the address bar after a failed exchange is strictly worse than after
 * a successful one, because the failure is the case where they linger. Replace
 * rather than assign so this adds no history entry.
 */
function clearCallbackFromUrl(): void {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Establish a session from an implicit-flow callback hash.
 *
 * Recognises Supabase's error callbacks too. A dead link comes back as
 * `#error=access_denied&error_description=...` with no tokens at all, which is
 * indistinguishable from an ordinary route unless it is checked for — that is
 * how an expired link used to land the user back on the signup screen with
 * nothing said.
 */
export async function consumeAuthCallback(hash: string): Promise<AuthCallbackResult> {
  // Tolerate both `#a=b` and `a=b`; a deep link's hash arrives with the marker.
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  const errorCode = params.get('error_code') ?? params.get('error');
  if (errorCode) {
    clearCallbackFromUrl();
    const expired = /expired|invalid|access_denied|otp/i.test(
      `${errorCode} ${params.get('error_description') ?? ''}`
    );
    return { status: 'error', message: expired ? EXPIRED : FAILED };
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return { status: 'none' };

  try {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return { status: 'error', message: EXPIRED };

    // A recovery link carries the same token pair as any other callback, so
    // without reading `type` it is indistinguishable from a sign-in — the app
    // would drop the user on the feed having promised them a new password.
    // The session it just created is what authorises updateUser({ password }).
    if (params.get('type') === 'recovery') return { status: 'recovery' };

    return { status: 'signed-in' };
  } catch {
    // setSession throws rather than returning on transport failure. Uncaught,
    // this was an unhandled rejection from a `void` call and the user saw
    // nothing at all.
    return { status: 'error', message: FAILED };
  } finally {
    // Whatever happened, the tokens are not staying in the URL.
    clearCallbackFromUrl();
  }
}

/**
 * Watch for callbacks for the lifetime of the app.
 *
 * Native only. On the web the Supabase client's own `detectSessionInUrl` reads
 * the URL as it is constructed and owns that path already; running both meant
 * two consumers racing for one set of single-use tokens, where which of them
 * cleared the URL or persisted the session first depended on client
 * initialisation timing. Native is the case Supabase cannot cover, because the
 * app is already running when the deep link arrives.
 *
 * Checks the hash once at startup — a cold launch from a deep link has it
 * already — then on every change, which is how `initCapacitor`'s `appUrlOpen`
 * handler delivers one to an app that is already running.
 */
export function initAuthCallback(): void {
  if (!isNativePlatform) return;

  const consume = (hash: string) => {
    void consumeAuthCallback(hash).then((result) => {
      if (result.status === 'error') {
        window.dispatchEvent(new CustomEvent(AUTH_CALLBACK_ERROR, { detail: result.message }));
      }
      if (result.status === 'recovery') {
        window.dispatchEvent(new Event(AUTH_PASSWORD_RECOVERY));
      }
    });
  };

  consume(window.location.hash);
  window.addEventListener('hashchange', () => consume(window.location.hash));
}
