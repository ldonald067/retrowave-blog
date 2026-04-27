import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { applyTheme, DEFAULT_THEME } from '../lib/themes';
import { toUserMessage } from '../lib/errors';
import { withRetry } from '../lib/retry';
import { requireAuth } from '../lib/auth-guard';
import { validateProfileInput, hasValidationErrors } from '../lib/validation';
import { MIN_AGE } from '../lib/constants';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  /** Set when profile fetch or creation fails so the UI can surface it. */
  profileError: string | null;
  loading: boolean;
  signUp: (
    email: string,
    birthYear: number,
    tosAccepted: boolean
  ) => Promise<{ error: string | null }>;
  /** Password-based sign-up, with no email delivery needed. */
  signUpWithPassword: (
    email: string,
    password: string,
    birthYear: number,
    tosAccepted: boolean
  ) => Promise<{ error: string | null }>;
  signIn: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  refetchProfile: () => Promise<void>;
  devSignUp?: (
    email: string,
    birthYear: number,
    tosAccepted: boolean
  ) => Promise<{ error: string | null }>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchingProfileFor = useRef<string | null>(null);
  const activeAuthUserIdRef = useRef<string | null>(null);
  const lastFetchRef = useRef<{ userId: string | null; time: number }>({
    userId: null,
    time: 0,
  });
  const profileIdRef = useRef<string | null>(null);
  const FETCH_COOLDOWN_MS = 2000;

  const setProfileState = (nextProfile: Profile | null): void => {
    profileIdRef.current = nextProfile?.id ?? null;
    setProfile(nextProfile);
  };

  const fetchProfile = async (
    userId: string,
    options: { force?: boolean } = {}
  ): Promise<void> => {
    if (fetchingProfileFor.current === userId) return;

    const now = Date.now();
    if (
      !options.force &&
      lastFetchRef.current.userId === userId &&
      now - lastFetchRef.current.time < FETCH_COOLDOWN_MS &&
      profileIdRef.current === userId
    ) {
      return;
    }

    lastFetchRef.current = { userId, time: now };
    fetchingProfileFor.current = userId;

    try {
      const { data, error } = await withRetry(async () =>
        supabase.from('profiles').select('*').eq('id', userId).single()
      );

      if (activeAuthUserIdRef.current !== userId) return;

      if (error) {
        const err = error as { code?: string };
        if (err.code === 'PGRST116') {
          const newProfile = await createProfileForUser(userId);
          if (activeAuthUserIdRef.current !== userId) return;
          if (newProfile) {
            setProfileState(newProfile);
            setProfileError(null);
            applyTheme(newProfile.theme ?? DEFAULT_THEME);
          }
          return;
        }
        throw error;
      }

      const profileData = data as Profile;
      setProfileState(profileData);
      setProfileError(null);
      applyTheme(profileData.theme ?? DEFAULT_THEME);
    } catch (err) {
      if (activeAuthUserIdRef.current !== userId) return;
      console.error('Error fetching profile:', toUserMessage(err));
      setProfileState(null);
      setProfileError('~ couldnt load ur profile :( try refreshing ~');
    } finally {
      if (fetchingProfileFor.current === userId) {
        fetchingProfileFor.current = null;
        setLoading(false);
      }
    }
  };

  const syncAuthState = (nextUser: User | null): void => {
    activeAuthUserIdRef.current = nextUser?.id ?? null;
    setUser(nextUser);
    setProfileError(null);

    if (!nextUser) {
      lastFetchRef.current = { userId: null, time: 0 };
      fetchingProfileFor.current = null;
      setProfileState(null);
      applyTheme(DEFAULT_THEME);
      setLoading(false);
      return;
    }

    const needsFreshProfile = profileIdRef.current !== nextUser.id;
    if (needsFreshProfile) {
      setLoading(true);
      setProfileState(null);
      applyTheme(DEFAULT_THEME);
    }

    void fetchProfile(nextUser.id);
  };

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'INITIAL_SESSION') return;

      syncAuthState(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;

      syncAuthState(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const createProfileForUser = async (userId: string): Promise<Profile | null> => {
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authUser = session?.user ?? null;
        const emailLocalPart = (authUser?.email?.split('@')[0] || 'user').replace(
          /[^a-zA-Z0-9_-]/g,
          '_'
        );
        const randomId = Math.random().toString(36).substring(2, 8);
        const defaultUsername = authUser?.email ? emailLocalPart : `guest_${randomId}`;

        const metadata = authUser?.user_metadata ?? {};
        const tosAccepted = Boolean(metadata['tos_accepted'] ?? false);
        const birthYear = metadata['birth_year'] ? Number(metadata['birth_year']) : null;
        const ageVerified = birthYear !== null && new Date().getFullYear() - birthYear >= MIN_AGE;

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
          if ((error as { code?: string }).code === '23505') {
            const { data: existing } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            return (existing as Profile) ?? null;
          }

          if (attempt < MAX_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
            continue;
          }
          console.error('Error creating profile after retries:', toUserMessage(error));
          if (activeAuthUserIdRef.current === userId) {
            setProfileError('~ couldnt set up ur profile :( try refreshing ~');
          }
          return null;
        }

        return data as Profile;
      } catch (err) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }
        console.error('Error creating profile:', toUserMessage(err));
        if (activeAuthUserIdRef.current === userId) {
          setProfileError('~ couldnt set up ur profile :( try refreshing ~');
        }
        return null;
      }
    }

    return null;
  };

  const signUp = async (
    email: string,
    birthYear: number,
    tosAccepted: boolean
  ): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            birth_year: birthYear,
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

  const signUpWithPassword = async (
    email: string,
    password: string,
    birthYear: number,
    tosAccepted: boolean
  ): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            birth_year: birthYear,
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

  const signIn = async (email: string): Promise<{ error: string | null }> => {
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
    password: string
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

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: string | null }> => {
    try {
      const auth = await requireAuth();
      if (auth.error) return { error: auth.error };
      const currentUser = auth.user!;

      const validationErrors = validateProfileInput(updates as Record<string, unknown>);
      if (hasValidationErrors(validationErrors)) {
        const firstError = Object.values(validationErrors)[0]!;
        return { error: firstError };
      }

      const { data, error } = await withRetry(async () =>
        supabase.from('profiles').update(updates).eq('id', currentUser.id).select().single()
      );

      if (error) throw error;
      if (!data) throw new Error('Profile update did not return a row.');

      const profileData = data as Profile;
      setProfileState(profileData);
      setProfileError(null);
      applyTheme(profileData.theme ?? DEFAULT_THEME);
      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  };

  const devSignUp = async (
    _email: string,
    birthYear: number,
    tosAccepted: boolean
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error: anonError } = await supabase.auth.signInAnonymously();

      if (anonError) {
        return { error: toUserMessage(anonError) };
      }

      if (data.user) {
        await supabase.auth.updateUser({
          data: {
            birth_year: birthYear,
            tos_accepted: tosAccepted,
          },
        });
        await fetchProfile(data.user.id, { force: true });
      }

      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  };

  const refetchProfile = async (): Promise<void> => {
    if (!user) return;
    setLoading(true);
    await fetchProfile(user.id, { force: true });
  };

  return {
    user,
    profile,
    profileError,
    loading,
    signUp,
    signUpWithPassword,
    signIn,
    signInWithPassword,
    signOut,
    updateProfile,
    refetchProfile,
    ...(import.meta.env.DEV ? { devSignUp } : {}),
  };
}
