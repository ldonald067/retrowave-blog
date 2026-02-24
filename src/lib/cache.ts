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

class TTLCache<K, V> {
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

  /** Remove expired entries, then evict oldest if still at capacity. Single-pass. */
  private evict(): void {
    const now = Date.now();
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      } else if (entry.expiresAt < oldestTime) {
        oldestKey = key;
        oldestTime = entry.expiresAt;
      }
    }

    // If still at capacity after removing expired, drop the oldest valid entry
    if (this.store.size >= this.maxSize && oldestKey !== undefined) {
      this.store.delete(oldestKey);
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
