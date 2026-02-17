import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseReactionsReturn {
  toggleReaction: (
    postId: string,
    emoji: string
  ) => Promise<{ error: string | null }>;
  loading: boolean;
}

export function useReactions(): UseReactionsReturn {
  const [loading, setLoading] = useState(false);

  const toggleReaction = useCallback(
    async (postId: string, emoji: string): Promise<{ error: string | null }> => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return { error: 'You must be logged in to react' };
        }

        // Check if reaction already exists
        const { data: existing } = await supabase
          .from('post_reactions')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction_type', emoji)
          .maybeSingle();

        if (existing) {
          // Remove reaction
          const { error } = await supabase
            .from('post_reactions')
            .delete()
            .eq('id', (existing as { id: string }).id);
          if (error) throw error;
        } else {
          // Add reaction
          const { error } = await supabase
            .from('post_reactions')
            .insert({
              post_id: postId,
              user_id: user.id,
              reaction_type: emoji,
            });
          if (error) throw error;
        }

        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'An error occurred' };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { toggleReaction, loading };
}
