import { describe, expect, it } from 'vitest';
import { quickContentCheck } from '../moderation';

describe('quickContentCheck', () => {
  it('allows empty input', () => {
    expect(quickContentCheck('').allowed).toBe(true);
    expect(quickContentCheck('   ').allowed).toBe(true);
  });

  it('allows ordinary journal text', () => {
    const r = quickContentCheck('had a lovely picnic in the park with friends today ☀️');
    expect(r.allowed).toBe(true);
    expect(r.severity).toBe('clean');
  });

  it('blocks links to adult domains (URL blocklist)', () => {
    const r = quickContentCheck('check this out https://pornhub.com/watch everyone');
    expect(r.allowed).toBe(false);
    expect(r.severity).toBe('blocked');
  });

  it('blocks URLs containing adult keywords regardless of domain', () => {
    const r = quickContentCheck('here https://example.com/xxx-explicit-content');
    expect(r.allowed).toBe(false);
    expect(r.severity).toBe('blocked');
  });

  it('does not block a benign URL', () => {
    const r = quickContentCheck('my favorite recipe https://example.com/apple-pie');
    expect(r.allowed).toBe(true);
  });
});
