import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseLikesReturn {
  likePost: (postId: string) => Promise<{ error: string | null }>;
  unlikePost: (postId: string) => Promise<{ error: string | null }>;
  loading: boolean;
}

export function useLikes(): UseLikesReturn {
  const [loading, setLoading] = useState<boolean>(false);

  const likePost = async (postId: string): Promise<{ error: string | null }> => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'You must be logged in to like posts' };
      }

      // Insert like
      const { error } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) {
        // Check if already liked (unique constraint violation)
        if (error.code === '23505') {
          return { error: 'You already liked this post' };
        }
        throw error;
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const unlikePost = async (postId: string): Promise<{ error: string | null }> => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'You must be logged in to unlike posts' };
      }

      // Delete like
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    } finally {
      setLoading(false);
    }
  };

  return {
    likePost,
    unlikePost,
    loading,
  };
}
