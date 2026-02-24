import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errors';
import { hapticImpact } from '../lib/capacitor';

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
}

// F2 FIX: Cooldown prevents rapid double-taps from firing competing
// insert + delete requests. 400ms covers iPhone's fast touch events.
const REACTION_COOLDOWN_MS = 400;

export function useReactions(
  options: UseReactionsOptions = {},
): UseReactionsReturn {
  const { onOptimisticUpdate } = options;

  // F2 FIX: Track in-flight reactions to prevent race conditions.
  // Key format: "postId:emoji" — one guard per post+emoji combination.
  const inFlightRef = useRef<Set<string>>(new Set());
  // F2 FIX: Per-reaction cooldown timestamps for debounce (iPhone touch).
  const cooldownRef = useRef<Map<string, number>>(new Map());

  const toggleReaction = useCallback(
    async (
      postId: string,
      emoji: string,
      currentUserReactions: string[],
    ): Promise<{ error: string | null }> => {
      const key = `${postId}:${emoji}`;

      // F2 FIX: If this exact reaction is already in-flight, silently ignore
      if (inFlightRef.current.has(key)) {
        return { error: null };
      }

      // F2 FIX: Cooldown guard — prevents rapid double-taps on iPhone
      const lastTime = cooldownRef.current.get(key);
      if (lastTime && Date.now() - lastTime < REACTION_COOLDOWN_MS) {
        return { error: null };
      }

      const wasActive = currentUserReactions.includes(emoji);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'You must be logged in to react' };
      }
      const user = session.user;

      // Mark in-flight and record timestamp before any work
      inFlightRef.current.add(key);
      cooldownRef.current.set(key, Date.now());

      // T4: Optimistic update — update the UI immediately
      onOptimisticUpdate?.(postId, emoji, user.id, wasActive);

      // Tactile feedback on iOS
      void hapticImpact();

      try {
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
        inFlightRef.current.delete(key);
      }
    },
    [onOptimisticUpdate],
  );

  return { toggleReaction };
}
