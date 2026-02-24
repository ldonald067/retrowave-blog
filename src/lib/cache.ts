/**
 * Lightweight in-memory TTL cache with optional max-size eviction.
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
  // L5 FIX: Cap maximum entries to prevent unbounded memory growth
  // during deep pagination. When full, the oldest entry is evicted.
  private maxSize: number;

  constructor(defaultTtlMs: number, maxSize = 100) {
    this.defaultTtl = defaultTtlMs;
    this.maxSize = maxSize;
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
    // Evict expired entries first, then oldest if still over limit
    if (this.store.size >= this.maxSize) {
      this.evict();
    }
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

  /** Remove expired entries, then evict oldest if still at capacity. */
  private evict(): void {
    const now = Date.now();

    // Pass 1: remove expired entries
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }

    // Pass 2: if still at capacity, drop the oldest entry (first inserted)
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }
  }
}

/** Post feed page cache. Key = "userId:cursor". TTL = 5 min. Max 50 entries. */
export const postsCache = new TTLCache<string, unknown[]>(5 * 60 * 1000, 50);

/** YouTube oEmbed title cache. Key = video ID. TTL = 60 min. Max 200 entries. */
export const youtubeTitleCache = new TTLCache<string, string | null>(
  60 * 60 * 1000,
  200,
);
