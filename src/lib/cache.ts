/**
 * Lightweight in-memory TTL cache.
 * State persists across re-renders but resets on page reload.
 *
 * USAGE:
 *   import { postsCache, youtubeTitleCache } from '../lib/cache';
 *   postsCache.set('page-1', posts);
 *   const cached = postsCache.get('page-1');
 *   postsCache.invalidateAll();
 */

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TTLCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();
  private defaultTtl: number;

  constructor(defaultTtlMs: number) {
    this.defaultTtl = defaultTtlMs;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl),
    });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  invalidate(key: K): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }
}

/** Post feed page cache. Key = "userId:cursor". TTL = 5 min. */
export const postsCache = new TTLCache<string, unknown[]>(5 * 60 * 1000);

/** YouTube oEmbed title cache. Key = video ID. TTL = 60 min. */
export const youtubeTitleCache = new TTLCache<string, string | null>(
  60 * 60 * 1000,
);
