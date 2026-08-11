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
 * the current origin, which keeps localhost working in development — the bare
 * Site URL would bounce a local signup to production.
 */
export function authRedirectTo(): string {
  return isNativePlatform ? NATIVE_CALLBACK : window.location.origin;
}

/**
 * Establish a session from an implicit-flow callback hash.
 *
 * Returns true only when a session was actually created, so callers can tell a
 * consumed callback from an ordinary route like `#/u/name`.
 */
export async function consumeAuthCallback(hash: string): Promise<boolean> {
  // Tolerate both `#a=b` and `a=b`; a deep link's hash arrives with the marker.
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return false;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) return false;

  // Clear the tokens once they are spent. They are credentials, and leaving
  // them in the address bar means they survive in history and in anything that
  // logs URLs. Replace rather than assign so this does not add a history entry.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
}

/**
 * Watch for callbacks for the lifetime of the app.
 *
 * Checks the hash once at startup — a cold launch from a deep link has it
 * already — then on every change, which is how `initCapacitor`'s `appUrlOpen`
 * handler delivers one to an app that is already running.
 */
export function initAuthCallback(): void {
  void consumeAuthCallback(window.location.hash);

  window.addEventListener('hashchange', () => {
    void consumeAuthCallback(window.location.hash);
  });
}
