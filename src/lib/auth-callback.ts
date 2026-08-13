/**
 * Email-confirmation callbacks.
 *
 * Signing up sends a link that has to come back to the client that started the
 * signup, and on iOS that is not a website. Every piece of that round trip was
 * already in place except the two ends: the `com.retrowave.journal` URL scheme
 * is registered in Info.plist, `com.retrowave.journal://` is on Supabase's
 * redirect allow-list, and `initCapacitor` already forwards an incoming deep
 * link's hash to `window.location.hash`. What was missing is that `signUp`
 * never asked for that redirect, so confirmation always landed on
 * https://retrowaveblog.com — the site, in Safari. The user tapped the link,
 * got signed in *in their browser*, returned to the app, and found the signup
 * screen again, because a Capacitor WKWebView has its own storage and knows
 * nothing about a session created in Safari.
 *
 * The second half is that `detectSessionInUrl` (on by default) only reads the
 * URL when the client is constructed. On the web that is enough — the browser
 * navigates to the callback and the client is built afterwards. On native the
 * app is already running when the deep link arrives, so the tokens turn up in
 * the hash long after that one check. They have to be picked up by hand.
 */
import { supabase } from './supabase';
import { isNativePlatform } from './capacitor';

/**
 * Custom scheme registered in ios/App/App/Info.plist.
 *
 * Bare, with no path, because this string has to match Supabase's redirect
 * allow-list, which holds exactly `com.retrowave.journal://` and no wildcard.
 * Supabase silently falls back to the Site URL when a redirect fails to match,
 * so adding a tidier `://auth-callback` path here would reinstate the very bug
 * this fixes, with nothing to show for it. Widening the allow-list to
 * `com.retrowave.journal://**` would be the alternative; that is a change to
 * production auth config, so it is not made unilaterally here.
 */
const NATIVE_CALLBACK = 'com.retrowave.journal://';

/**
 * Where a confirmation or magic link should send the user back to.
 *
 * Native gets the deep link so the session is created inside the app. Web gets
 * the current origin, which matches the allow-list entry
 * `https://retrowaveblog.com/**` in production.
 *
 * This does NOT make local development work: the allow-list holds only that
 * pattern and the app scheme, so a signup from http://localhost:5174 fails to
 * match and Supabase redirects to the Site URL — a confirmation started locally
 * lands on production. Confirming a local signup needs the dev origin added to
 * the allow-list first.
 */
export function authRedirectTo(): string {
  return isNativePlatform ? NATIVE_CALLBACK : window.location.origin;
}

/** `none` means the hash was an ordinary route, not a callback. */
export type AuthCallbackResult =
  | { status: 'none' }
  | { status: 'signed-in' }
  | { status: 'error'; message: string };

/** Event carrying a failed callback to whatever is rendering the UI. */
export const AUTH_CALLBACK_ERROR = 'auth-callback-error';

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
    });
  };

  consume(window.location.hash);
  window.addEventListener('hashchange', () => consume(window.location.hash));
}
