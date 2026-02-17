import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { applyTheme, DEFAULT_THEME } from '../lib/themes';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    birthYear: number,
    tosAccepted: boolean
  ) => Promise<{ error: string | null }>;
  signIn: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  devSignUp: (
    email: string,
    birthYear: number,
    tosAccepted: boolean
  ) => Promise<{ error: string | null }>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string): Promise<void> => {
    try {
      // Use select('*') and let Supabase return all columns
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist (PGRST116 = no rows), create one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating one...');
          const newProfile = await createProfileForUser(userId);
          if (newProfile) {
            setProfile(newProfile);
            applyTheme(newProfile.theme ?? DEFAULT_THEME);
          }
          return;
        }
        throw error;
      }
      setProfile(data as Profile);
      // Apply the user's saved theme (or default)
      applyTheme((data as Profile | null)?.theme ?? DEFAULT_THEME);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const createProfileForUser = async (userId: string): Promise<Profile | null> => {
    try {
      // Get user email for username and display name
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const emailLocalPart = authUser?.email?.split('@')[0] || 'user';
      // Generate a random guest username for anonymous users
      const randomId = Math.random().toString(36).substring(2, 8);
      const defaultUsername = authUser?.email ? emailLocalPart : `guest_${randomId}`;

      const profileData = {
        id: userId,
        username: defaultUsername,
        // Use null display_name to indicate profile needs setup
        display_name: null,
        age_verified: true,
        tos_accepted: true,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Error creating profile:', err);
      return null;
    }
  };

  const signUp = async (
    email: string,
    birthYear: number,
    tosAccepted: boolean
  ): Promise<{ error: string | null }> => {
    try {
      // Use magic link (OTP) for passwordless signup
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
      console.error('Signup error:', err);
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const signIn = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const signOut = async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: string | null }> => {
    try {
      if (!user) {
        return { error: 'You must be logged in to update your profile' };
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Refetch profile
      await fetchProfile(user.id);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  // DEV ONLY: Sign up using anonymous auth (bypasses email completely)
  const devSignUp = async (
    _email: string,
    birthYear: number,
    tosAccepted: boolean
  ): Promise<{ error: string | null }> => {
    try {
      // Use anonymous sign in - no email required!
      const { data, error: anonError } = await supabase.auth.signInAnonymously();

      if (anonError) {
        // If anonymous auth is not enabled, show helpful message
        if (anonError.message.includes('Anonymous sign-ins are disabled')) {
          return {
            error: 'Please enable Anonymous sign-ins in Supabase Dashboard: Authentication → Providers → Anonymous → Enable'
          };
        }
        throw anonError;
      }

      // Update the user's metadata with birth year and TOS
      if (data.user) {
        await supabase.auth.updateUser({
          data: {
            birth_year: birthYear,
            age_verified: true,
            tos_accepted: tosAccepted,
          },
        });
      }

      return { error: null };
    } catch (err) {
      console.error('Dev signup error:', err);
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithPassword,
    signOut,
    updateProfile,
    devSignUp,
  };
}
