import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { applyTheme, DEFAULT_THEME } from '../lib/themes';
import { toUserMessage } from '../lib/errors';
import { withRetry } from '../lib/retry';
import {
  validateProfileInput,
  hasValidationErrors,
} from '../lib/validation';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  /** Set when profile fetch/creation fails — show in UI so user knows */
  profileError: string | null;
  loading: boolean;
  signUp: (
    email: string,
    birthYear: number,
    tosAccepted: boolean,
  ) => Promise<{ error: string | null }>;
  signIn: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (
    updates: Partial<Profile>,
  ) => Promise<{ error: string | null }>;
  /** Re-fetch the profile from the database without updating it. */
  refetchProfile: () => Promise<void>;
  // Only available in development builds. Guard call sites with import.meta.env.DEV.
  devSignUp?: (
    email: string,
    birthYear: number,
    tosAccepted: boolean,
  ) => Promise<{ error: string | null }>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // T2-3 FIX: Track in-flight fetchProfile to avoid duplicate concurrent calls.
  const fetchingProfileFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // T2-3 FIX: Set up listener BEFORE getSession.
    // Skip INITIAL_SESSION — getSession handles that path below.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'INITIAL_SESSION') return;

      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Get initial session (source of truth for first render)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string): Promise<void> => {
    // Prevent duplicate concurrent fetches for the same user
    if (fetchingProfileFor.current === userId) return;
    fetchingProfileFor.current = userId;

    try {
      // T2-2: Retry transient failures
      const { data, error } = await withRetry(async () =>
        supabase.from('profiles').select('*').eq('id', userId).single(),
      );

      if (error) {
        const err = error as { code?: string };
        if (err.code === 'PGRST116') {
          // Profile missing — attempt creation
          const newProfile = await createProfileForUser(userId);
          if (newProfile) {
            setProfile(newProfile);
            applyTheme(newProfile.theme ?? DEFAULT_THEME);
          }
          return;
        }
        throw error;
      }

      const profileData = data as Profile;
      setProfile(profileData);
      applyTheme(profileData.theme ?? DEFAULT_THEME);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
      setProfileError('~ couldnt load ur profile :( try refreshing ~');
    } finally {
      fetchingProfileFor.current = null;
      setLoading(false);
    }
  };

  // T1-1 FIX: Read actual metadata from the auth user object.
  // No longer hardcodes age_verified: true.
  const createProfileForUser = async (
    userId: string,
  ): Promise<Profile | null> => {
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // L7 FIX: Use getSession() (local, no network call) instead of
        // getUser() (network round-trip). We already have the userId param
        // and just need the user's email + metadata from the cached session.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authUser = session?.user ?? null;
        const emailLocalPart = authUser?.email?.split('@')[0] || 'user';
        const randomId = Math.random().toString(36).substring(2, 8);
        const defaultUsername = authUser?.email
          ? emailLocalPart
          : `guest_${randomId}`;

        // T1-1 FIX: Read actual metadata values; default to false so
        // the age gate in App.tsx is triggered for unverified users.
        const metadata = authUser?.user_metadata ?? {};
        const ageVerified = Boolean(metadata['age_verified'] ?? false);
        const tosAccepted = Boolean(metadata['tos_accepted'] ?? false);
        const birthYear = metadata['birth_year']
          ? Number(metadata['birth_year'])
          : null;

        const profileData = {
          id: userId,
          username: defaultUsername,
          display_name: null,
          age_verified: ageVerified,
          tos_accepted: tosAccepted,
          birth_year: birthYear,
        };

        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) {
          // Profile was created by the DB trigger between our check and insert
          if ((error as { code?: string }).code === '23505') {
            const { data: existing } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            return (existing as Profile) ?? null;
          }

          // T2-1 FIX: Retry transient errors
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 300 * attempt));
            continue;
          }
          console.error('Error creating profile after retries:', error);
          setProfileError('~ couldnt set up ur profile :( try refreshing ~');
          return null;
        }

        return data as Profile;
      } catch (err) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
          continue;
        }
        console.error('Error creating profile:', err);
        setProfileError('~ couldnt set up ur profile :( try refreshing ~');
        return null;
      }
    }

    return null;
  };

  const signUp = async (
    email: string,
    birthYear: number,
    tosAccepted: boolean,
  ): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            birth_year: birthYear,
            age_verified: true,
            tos_accepted: tosAccepted,
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  };

  const signIn = async (
    email: string,
  ): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  };

  const signInWithPassword = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  };

  const signOut = async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  };

  const updateProfile = async (
    updates: Partial<Profile>,
  ): Promise<{ error: string | null }> => {
    try {
      if (!user) {
        return { error: 'You must be logged in to update your profile' };
      }

      // F3 FIX: Validate string field lengths before sending to DB.
      // Prevents oversized values from hitting the server and gives
      // immediate feedback in the UI.
      const validationErrors = validateProfileInput(
        updates as Record<string, unknown>,
      );
      if (hasValidationErrors(validationErrors)) {
        const firstError = Object.values(validationErrors)[0]!;
        return { error: firstError };
      }

      const { error } = await withRetry(async () =>
        supabase.from('profiles').update(updates).eq('id', user.id),
      );

      if (error) throw error;
      await fetchProfile(user.id);
      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  };

  // DEV ONLY: Sign up using anonymous auth (bypasses email completely)
  const devSignUp = async (
    _email: string,
    birthYear: number,
    tosAccepted: boolean,
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error: anonError } =
        await supabase.auth.signInAnonymously();

      if (anonError) {
        return { error: toUserMessage(anonError) };
      }

      // T1-1 FIX: Set metadata BEFORE fetchProfile runs so
      // createProfileForUser reads correct values.
      if (data.user) {
        await supabase.auth.updateUser({
          data: {
            birth_year: birthYear,
            age_verified: true,
            tos_accepted: tosAccepted,
          },
        });
        await fetchProfile(data.user.id);
      }

      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  };

  // C2 FIX: Expose refetchProfile so callers can refresh after RPC calls
  // (e.g., set_age_verification) that bypass the normal updateProfile path.
  const refetchProfile = async (): Promise<void> => {
    if (user) await fetchProfile(user.id);
  };

  return {
    user,
    profile,
    profileError,
    loading,
    signUp,
    signIn,
    signInWithPassword,
    signOut,
    updateProfile,
    refetchProfile,
    // T4: Only expose devSignUp in development. Vite replaces import.meta.env.DEV
    // with `false` in production, and tree-shaking removes the dead code.
    ...(import.meta.env.DEV ? { devSignUp } : {}),
  };
}
