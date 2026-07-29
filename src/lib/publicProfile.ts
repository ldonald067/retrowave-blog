import { SITE_URL } from './constants';

export function buildPublicProfilePath(username: string): string {
  return `/#/u/${encodeURIComponent(username)}`;
}

/**
 * Always builds against the canonical public origin, never window.location.origin.
 * Inside the Capacitor WebView the origin is `capacitor://localhost`, so the
 * shared/copied link was `capacitor://localhost/#/u/name` — unopenable in any
 * browser, and silently broken for whoever received it.
 */
export function buildPublicProfileUrl(username: string, origin = SITE_URL): string {
  return `${origin}${buildPublicProfilePath(username)}`;
}
