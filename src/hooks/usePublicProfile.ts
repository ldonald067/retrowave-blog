import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { withRetry } from '../lib/retry';
import type { PublicProfileData } from '../types/profile';

interface UsePublicProfileReturn {
  data: PublicProfileData | null;
  loading: boolean;
  notFound: boolean;
}

/**
 * Fetches a public profile by username. No auth required.
 * Returns null + notFound=true if profile doesn't exist or isn't public.
 */
export function usePublicProfile(username: string | null): UsePublicProfileReturn {
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const requestIdRef = useRef(0);

  const fetchProfile = useCallback(async (name: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setNotFound(false);
    try {
      const { data: result, error } = await withRetry(async () =>
        supabase.rpc('get_public_profile', { p_username: name })
      );

      if (requestId !== requestIdRef.current) return;
      if (error || !result) {
        setData(null);
        setNotFound(true);
      } else {
        setData(result as unknown as PublicProfileData);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.warn('[usePublicProfile] fetch failed:', err);
      setData(null);
      setNotFound(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (username) {
      void fetchProfile(username);
    } else {
      requestIdRef.current += 1;
      setData(null);
      setNotFound(false);
      setLoading(false);
    }
  }, [username, fetchProfile]);

  return { data, loading, notFound };
}
