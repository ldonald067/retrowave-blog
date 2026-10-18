import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errors';
import { withRetry } from '../lib/retry';
import { requireAuth } from '../lib/auth-guard';

export interface BlockedUser {
  blocked_id: string;
  created_at: string | null;
  /** Null unless the blocked person's page is public (see get_blocked_users). */
  username: string | null;
  display_name: string | null;
}

interface UseBlocksReturn {
  /** Toggle block/unblock for a user. Returns whether they are now blocked. */
  toggleBlock: (targetUserId: string) => Promise<{ is_blocked: boolean; error: string | null }>;
  /** Fetch the list of users the current user has blocked. */
  fetchBlockedUsers: () => Promise<{ data: BlockedUser[]; error: string | null }>;
}

export function useBlocks(): UseBlocksReturn {
  const toggleBlock = useCallback(
    async (targetUserId: string): Promise<{ is_blocked: boolean; error: string | null }> => {
      try {
        const auth = await requireAuth();
        if (auth.error) return { is_blocked: false, error: auth.error };

        const { data, error } = await withRetry(async () =>
          supabase.rpc('toggle_user_block', { p_target_user_id: targetUserId })
        );
        if (error) throw error;
        const result = data as { is_blocked: boolean } | null;
        return { is_blocked: result?.is_blocked ?? false, error: null };
      } catch (err) {
        return { is_blocked: false, error: toUserMessage(err) };
      }
    },
    []
  );

  const fetchBlockedUsers = useCallback(async (): Promise<{
    data: BlockedUser[];
    error: string | null;
  }> => {
    try {
      const auth = await requireAuth();
      if (auth.error) return { data: [], error: auth.error };

      // An RPC, not a select: profiles' RLS is own-row only, so a join from
      // user_blocks could never reach the blocked person's name.
      const { data, error } = await withRetry(async () => supabase.rpc('get_blocked_users'));
      if (error) throw error;
      return { data: (data as BlockedUser[]) ?? [], error: null };
    } catch (err) {
      return { data: [], error: toUserMessage(err) };
    }
  }, []);

  return { toggleBlock, fetchBlockedUsers };
}
