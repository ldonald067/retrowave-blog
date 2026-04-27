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
  refetch: () => Promise<void>;
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

  const fetchChapters = useCallback(async () => {
    const requestUserId = currentUserId;
    if (!requestUserId) {
      setChapters([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await withRetry(async () => supabase.rpc('get_user_chapters'));
      if (activeUserIdRef.current !== requestUserId) return;
      if (error) throw error;
      setChapters((data as Chapter[]) ?? []);
    } catch (err) {
      if (activeUserIdRef.current !== requestUserId) return;
      // Chapters are optional UX — degrade gracefully but log for observability
      console.warn('[useChapters] fetch failed:', err);
      setChapters([]);
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
