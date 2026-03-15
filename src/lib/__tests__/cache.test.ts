import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the class by re-creating a cache (the module exports singletons)
// We test via the exported singletons to match real usage
import { postsCache, youtubeTitleCache } from '../cache';

describe('TTLCache (via postsCache)', () => {
  beforeEach(() => {
    postsCache.invalidateAll();
  });

  it('returns undefined for missing key', () => {
    expect(postsCache.get('nonexistent')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    postsCache.set('key1', [{ id: '1' }]);
    expect(postsCache.get('key1')).toEqual([{ id: '1' }]);
  });

  it('has() returns true for existing key', () => {
    postsCache.set('key1', []);
    expect(postsCache.has('key1')).toBe(true);
  });

  it('has() returns false for missing key', () => {
    expect(postsCache.has('nope')).toBe(false);
  });

  it('invalidate() removes a single key', () => {
    postsCache.set('a', [1]);
    postsCache.set('b', [2]);
    postsCache.invalidate('a');
    expect(postsCache.get('a')).toBeUndefined();
    expect(postsCache.get('b')).toEqual([2]);
  });

  it('invalidateAll() clears all entries', () => {
    postsCache.set('a', [1]);
    postsCache.set('b', [2]);
    postsCache.invalidateAll();
    expect(postsCache.get('a')).toBeUndefined();
    expect(postsCache.get('b')).toBeUndefined();
  });

  it('returns undefined for expired entries', () => {
    vi.useFakeTimers();
    postsCache.set('expire-me', [1], 100); // 100ms TTL
    expect(postsCache.get('expire-me')).toEqual([1]);

    vi.advanceTimersByTime(150);
    expect(postsCache.get('expire-me')).toBeUndefined();
    vi.useRealTimers();
  });

  it('has() returns false for expired entries', () => {
    vi.useFakeTimers();
    postsCache.set('expire-me', [1], 100);
    vi.advanceTimersByTime(150);
    expect(postsCache.has('expire-me')).toBe(false);
    vi.useRealTimers();
  });
});

describe('TTLCache (via youtubeTitleCache)', () => {
  beforeEach(() => {
    youtubeTitleCache.invalidateAll();
  });

  it('caches null values (failed lookups)', () => {
    youtubeTitleCache.set('bad-id', null);
    expect(youtubeTitleCache.has('bad-id')).toBe(true);
    expect(youtubeTitleCache.get('bad-id')).toBeNull();
  });

  it('caches string values', () => {
    youtubeTitleCache.set('abc123', 'Never Gonna Give You Up');
    expect(youtubeTitleCache.get('abc123')).toBe('Never Gonna Give You Up');
  });
});
