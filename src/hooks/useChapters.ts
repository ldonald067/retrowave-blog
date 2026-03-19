import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { withRetry } from '../lib/retry';
import { requireAuth } from '../lib/auth-guard';

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
export function useChapters(): UseChaptersReturn {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChapters = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await requireAuth();
      if (auth.error) {
        setChapters([]);
        return;
      }
      const { data, error } = await withRetry(async () =>
        supabase.rpc('get_user_chapters'),
      );
      if (error) throw error;
      setChapters((data as Chapter[]) ?? []);
    } catch (err) {
      // Chapters are optional UX — degrade gracefully but log for observability
      console.warn('[useChapters] fetch failed:', err);
      setChapters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchChapters();
  }, [fetchChapters]);

  return { chapters, loading, refetch: fetchChapters };
}
