import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { withRetry } from '../lib/retry';

export interface Chapter {
  chapter: string;
  post_count: number;
  latest_post: string;
}

interface UseChaptersReturn {
  chapters: Chapter[];
  loading: boolean;
  /**
   * Resolves to the fresh list, or null when the fetch failed or was superseded.
   * Never an empty list standing in for an error: callers prune private_chapters
   * on it, and a chapter wrongly reported empty would have its entries published.
   */
  refetch: () => Promise<Chapter[] | null>;
}

/**
 * Fetches the current user's chapter list for autocomplete and browsing.
 * Returns chapters sorted by most recent post date.
 */
export function useChapters(currentUserId: string | null): UseChaptersReturn {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const activeUserIdRef = useRef<string | null>(currentUserId);

  useEffect(() => {
    activeUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const fetchChapters = useCallback(async (): Promise<Chapter[] | null> => {
    const requestUserId = currentUserId;
    if (!requestUserId) {
      setChapters([]);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await withRetry(async () => supabase.rpc('get_user_chapters'));
      if (activeUserIdRef.current !== requestUserId) return null;
      if (error) throw error;
      setChapters((data as Chapter[]) ?? []);
      return (data as Chapter[] | null) ?? null;
    } catch (err) {
      if (activeUserIdRef.current !== requestUserId) return null;
      // Chapters are optional UX — degrade gracefully but log for observability
      console.warn('[useChapters] fetch failed:', err);
      setChapters([]);
      return null;
    } finally {
      if (activeUserIdRef.current === requestUserId) {
        setLoading(false);
      }
    }
  }, [currentUserId]);

  useEffect(() => {
    void fetchChapters();
  }, [fetchChapters]);

  return { chapters, loading, refetch: fetchChapters };
}
