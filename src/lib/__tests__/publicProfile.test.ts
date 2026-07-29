import { describe, expect, it } from 'vitest';
import { buildPublicProfilePath, buildPublicProfileUrl } from '../publicProfile';
import { SITE_URL } from '../constants';

describe('publicProfile helpers', () => {
  it('builds encoded public profile hash paths', () => {
    expect(buildPublicProfilePath('jane diary')).toBe('/#/u/jane%20diary');
  });

  it('builds absolute public profile urls from an origin', () => {
    expect(buildPublicProfileUrl('jane', 'https://example.com')).toBe(
      'https://example.com/#/u/jane'
    );
  });

  it('defaults to the canonical site origin, never the runtime origin', () => {
    // Regression: the default was window.location.origin, which inside the
    // Capacitor WebView is `capacitor://localhost` — so every shared/copied
    // public link was unopenable.
    const url = buildPublicProfileUrl('jane');
    expect(url).toBe(`${SITE_URL}/#/u/jane`);
    expect(url.startsWith('https://')).toBe(true);
    expect(url).not.toContain('capacitor');
    expect(url).not.toContain('localhost');
  });
});
