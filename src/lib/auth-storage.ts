import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Where the Supabase session is persisted.
 *
 * On the web this stays `localStorage`, which is what supabase-js would have
 * chosen anyway. On iOS it must not be: a Capacitor app's `localStorage` lives
 * in the WKWebView's website data store, which iOS reclaims under disk pressure
 * and after long idle periods. Nothing warns the app and nothing fails loudly —
 * the token is simply gone on the next launch and the user lands on the signup
 * screen having never signed out.
 *
 * That is not theoretical. Deleting only the `sb-*-auth-token` row from
 * `WebsiteData/.../LocalStorage/localstorage.sqlite3` and relaunching reproduces
 * the reported silent sign-out exactly, first try. `/ios` documents the test.
 *
 * `Preferences` is `UserDefaults` on iOS: app-owned, outside the website data
 * store, and not reclaimed to free space.
 */
const isNative = Capacitor.isNativePlatform();

/**
 * Reads fall back to `localStorage` once, and write through.
 *
 * Shipping a bare swap would sign every existing user out on upgrade: their
 * session is in `localStorage`, the client would look in `Preferences`, find
 * nothing, and bounce them to auth — the precise failure this change exists to
 * prevent. Doing the migration inside `getItem` rather than as a startup step
 * also removes a race, since supabase-js reads storage from its own async
 * initialisation and cannot be sequenced after an external migration call.
 *
 * The legacy copy is deliberately left in place. It is inert once `Preferences`
 * has the value, and deleting it would risk discarding the only copy if the
 * write above it ever failed.
 */
function forgetLegacy(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clean up if the store is unavailable.
  }
}

export const authStorage = isNative
  ? {
      getItem: async (key: string): Promise<string | null> => {
        const { value } = await Preferences.get({ key });
        // Truthy, not `!= null`. supabase-js clears a session by writing an
        // empty string rather than removing the key, and an empty string is
        // never a valid session — treating it as present returned "" to a
        // JSON.parse and, worse, permanently shadowed the migration below.
        if (value) return value;

        try {
          const legacy = localStorage.getItem(key);
          if (legacy) {
            await Preferences.set({ key, value: legacy });
            return legacy;
          }
        } catch {
          // localStorage can throw if the store is unavailable; treat as absent.
        }
        return null;
      },
      setItem: async (key: string, value: string): Promise<void> => {
        // An empty write is a clear. Storing it verbatim would leave the legacy
        // copy behind for the fallback above to resurrect as a dead session.
        if (!value) {
          await Preferences.remove({ key });
          forgetLegacy(key);
          return;
        }
        await Preferences.set({ key, value });
        // The durable store is now authoritative; drop the evictable duplicate
        // so it can never come back as a stale session.
        forgetLegacy(key);
      },
      removeItem: async (key: string): Promise<void> => {
        await Preferences.remove({ key });
        forgetLegacy(key);
      },
    }
  : undefined;
