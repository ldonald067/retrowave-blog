import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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

  const fetchProfile = useCallback(async (name: string) => {
    setLoading(true);
    setNotFound(false);

    const { data: result, error } = await supabase.rpc('get_public_profile', {
      p_username: name,
    });

    if (error || !result) {
      setData(null);
      setNotFound(true);
    } else {
      setData(result as unknown as PublicProfileData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (username) {
      void fetchProfile(username);
    } else {
      setData(null);
      setNotFound(false);
    }
  }, [username, fetchProfile]);

  return { data, loading, notFound };
}
