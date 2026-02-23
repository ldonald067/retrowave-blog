import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errors';

interface UseReactionsOptions {
  /**
   * Called BEFORE the server round-trip with the predicted new state.
   * Called AGAIN with opposite values on server error (rollback).
   */
  onOptimisticUpdate?: (
    postId: string,
    emoji: string,
    userId: string,
    wasActive: boolean,
  ) => void;
}

interface UseReactionsReturn {
  toggleReaction: (
    postId: string,
    emoji: string,
    currentUserReactions: string[],
  ) => Promise<{ error: string | null }>;
  loading: boolean;
}

export function useReactions(
  options: UseReactionsOptions = {},
): UseReactionsReturn {
  const [loading, setLoading] = useState(false);
  const { onOptimisticUpdate } = options;

  const toggleReaction = useCallback(
    async (
      postId: string,
      emoji: string,
      currentUserReactions: string[],
    ): Promise<{ error: string | null }> => {
      const wasActive = currentUserReactions.includes(emoji);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'You must be logged in to react' };
      }

      // T4: Optimistic update — update the UI immediately
      onOptimisticUpdate?.(postId, emoji, user.id, wasActive);

      try {
        setLoading(true);

        if (wasActive) {
          const { error } = await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .eq('reaction_type', emoji);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('post_reactions').insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: emoji,
          });
          if (error) throw error;
        }

        return { error: null };
      } catch (err) {
        // Rollback: apply the opposite operation
        onOptimisticUpdate?.(postId, emoji, user.id, !wasActive);
        return { error: toUserMessage(err) };
      } finally {
        setLoading(false);
      }
    },
    [onOptimisticUpdate],
  );

  return { toggleReaction, loading };
}
