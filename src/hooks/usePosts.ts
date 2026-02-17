import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Post, CreatePostInput } from '../types/post';

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  createPost: (post: CreatePostInput) => Promise<{ data: Post | null; error: string | null }>;
  updatePost: (
    id: string,
    updates: Partial<CreatePostInput>
  ) => Promise<{ data: Post | null; error: string | null }>;
  deletePost: (id: string) => Promise<{ error: string | null }>;
  refetch: () => Promise<void>;
}

export function usePosts(): UsePostsReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async (): Promise<void> => {
    try {
      setLoading(true);

      // Get current user for user_reactions
      const { data: { user } } = await supabase.auth.getUser();

      // Use posts_with_details view for likes and profile info
      const { data, error } = await supabase
        .from('posts_with_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postsData = (data as Post[]) || [];

      // Fetch reactions for all posts
      if (postsData.length > 0) {
        const postIds = postsData.map(p => p.id);

        // Get all reactions for these posts
        const { data: reactionsData } = await supabase
          .from('post_reactions')
          .select('post_id, reaction_type, user_id')
          .in('post_id', postIds);

        // Group reactions by post
        const reactionsByPost: Record<string, { counts: Record<string, number>; userReactions: string[] }> = {};

        if (reactionsData) {
          for (const reaction of reactionsData) {
            const postId = reaction.post_id;
            if (!reactionsByPost[postId]) {
              reactionsByPost[postId] = { counts: {}, userReactions: [] };
            }
            const postReactionData = reactionsByPost[postId];
            // Count reactions
            postReactionData.counts[reaction.reaction_type] =
              (postReactionData.counts[reaction.reaction_type] || 0) + 1;
            // Track user's reactions
            if (user && reaction.user_id === user.id) {
              postReactionData.userReactions.push(reaction.reaction_type);
            }
          }
        }

        // Merge reactions into posts
        for (const post of postsData) {
          const postReactions = reactionsByPost[post.id];
          post.reactions = postReactions?.counts || {};
          post.user_reactions = postReactions?.userReactions || [];
        }
      }

      setPosts(postsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const createPost = async (
    post: CreatePostInput
  ): Promise<{ data: Post | null; error: string | null }> => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'You must be logged in to create a post' };
      }

      // Insert post with user_id
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            ...post,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      const postData = data as Post;
      if (postData) {
        setPosts([postData, ...posts]);
      }
      return { data: postData, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const updatePost = async (
    id: string,
    updates: Partial<CreatePostInput>
  ): Promise<{ data: Post | null; error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const postData = data as Post;
      if (postData) {
        setPosts(posts.map((p) => (p.id === id ? postData : p)));
      }
      return { data: postData, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const deletePost = async (id: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);

      if (error) throw error;
      setPosts(posts.filter((p) => p.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    refetch: fetchPosts,
  };
}
