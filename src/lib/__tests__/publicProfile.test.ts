import { describe, expect, it } from 'vitest';
import { buildPublicProfilePath, buildPublicProfileUrl } from '../publicProfile';

describe('publicProfile helpers', () => {
  it('builds encoded public profile hash paths', () => {
    expect(buildPublicProfilePath('jane diary')).toBe('/#/u/jane%20diary');
  });

  it('builds absolute public profile urls from an origin', () => {
    expect(buildPublicProfileUrl('jane', 'https://example.com')).toBe('https://example.com/#/u/jane');
  });
});
