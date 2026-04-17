import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errors';
import { withRetry } from '../lib/retry';
import { requireAuth } from '../lib/auth-guard';
import { postsCache } from '../lib/cache';
import { validatePostInput, validateEmbeddedLinks, hasValidationErrors } from '../lib/validation';
import type { Post, CreatePostInput } from '../types/post';

const PAGE_SIZE = 20;

function cacheKey(userId: string, cursor: string | null): string {
  return `${userId}:${cursor ?? 'initial'}`;
}

function normalizePost(post: Post): Post {
  return {
    ...post,
    reactions: (post.reactions as Record<string, number>) ?? {},
    user_reactions: (post.user_reactions as string[]) ?? [],
  };
}

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  /** Error from pagination, shown inline instead of replacing the full screen. */
  loadMoreError: string | null;
  createPost: (post: CreatePostInput) => Promise<{ data: Post | null; error: string | null }>;
  updatePost: (
    id: string,
    updates: Partial<CreatePostInput>
  ) => Promise<{ data: Post | null; error: string | null }>;
  deletePost: (id: string) => Promise<{ error: string | null }>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  /** Optimistically update reactions for a single post without a server round trip. */
  applyOptimisticReaction: (
    postId: string,
    emoji: string,
    userId: string,
    wasActive: boolean
  ) => void;
  /** Fetch a single post with full content for view/edit modes. */
  fetchPost: (postId: string) => Promise<Post | null>;
}

export function usePosts(currentUserId: string | null): UsePostsReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const loadingMoreRef = useRef<boolean>(false);

  const resetPostsState = useCallback((): void => {
    setPosts([]);
    setError(null);
    setLoadMoreError(null);
    setLoadingMore(false);
    setHasMore(false);
    cursorRef.current = null;
    loadingMoreRef.current = false;
  }, []);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean): Promise<void> => {
      if (!currentUserId) {
        resetPostsState();
        return;
      }

      if (activeUserIdRef.current !== currentUserId) return;

      const key = cacheKey(currentUserId, cursor);
      const cached = postsCache.get(key) as Post[] | undefined;
      if (cached) {
        if (activeUserIdRef.current !== currentUserId) return;
        if (append) {
          setPosts((prev) => [...prev, ...cached]);
        } else {
          setPosts(cached);
        }
        if (cached.length >= PAGE_SIZE) {
          cursorRef.current = cached[cached.length - 1]!.created_at;
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        return;
      }

      const { data, error: rpcError } = await withRetry(async () =>
        supabase.rpc('get_posts_with_reactions', {
          p_cursor: cursor,
          p_limit: PAGE_SIZE,
        })
      );

      if (rpcError) throw rpcError;
      if (activeUserIdRef.current !== currentUserId) return;

      const page = ((data as Post[]) ?? []).map(normalizePost);
      postsCache.set(key, page);

      if (page.length > 0) {
        cursorRef.current = page[page.length - 1]!.created_at;
      }
      setHasMore(page.length >= PAGE_SIZE);

      if (append) {
        setPosts((prev) => [...prev, ...page]);
      } else {
        setPosts(page);
      }
    },
    [currentUserId, resetPostsState]
  );

  useEffect(() => {
    let cancelled = false;

    const loadInitialPage = async (): Promise<void> => {
      if (activeUserIdRef.current !== currentUserId) {
        postsCache.invalidateAll();
        activeUserIdRef.current = currentUserId;
        resetPostsState();
      }

      if (!currentUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setLoadMoreError(null);
        cursorRef.current = null;
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setHasMore(true);
        await fetchPage(null, false);
      } catch (err) {
        if (!cancelled && activeUserIdRef.current === currentUserId) {
          setError(toUserMessage(err));
        }
      } finally {
        if (!cancelled && activeUserIdRef.current === currentUserId) {
          setLoading(false);
        }
      }
    };

    void loadInitialPage();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, fetchPage, resetPostsState]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!currentUserId || loadingMoreRef.current || !hasMore) return;

    loadingMoreRef.current = true;
    setLoadMoreError(null);

    try {
      setLoadingMore(true);
      await fetchPage(cursorRef.current, true);
    } catch (err) {
      setLoadMoreError(toUserMessage(err));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [currentUserId, fetchPage, hasMore]);

  const refetch = useCallback(async (): Promise<void> => {
    postsCache.invalidateAll();

    if (!currentUserId) {
      resetPostsState();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLoadMoreError(null);
      cursorRef.current = null;
      setHasMore(true);
      await fetchPage(null, false);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentUserId, fetchPage, resetPostsState]);

  const applyOptimisticReaction = useCallback(
    (postId: string, emoji: string, _userId: string, wasActive: boolean): void => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const currentCount = post.reactions?.[emoji] ?? 0;
          const newReactions = {
            ...post.reactions,
            [emoji]: wasActive ? Math.max(0, currentCount - 1) : currentCount + 1,
          };
          if (newReactions[emoji] === 0) delete newReactions[emoji];

          const currentUserReactions = post.user_reactions ?? [];
          const newUserReactions = wasActive
            ? currentUserReactions.filter((reaction) => reaction !== emoji)
            : [...currentUserReactions, emoji];

          return {
            ...post,
            reactions: newReactions,
            user_reactions: newUserReactions,
          };
        })
      );
      postsCache.invalidateAll();
    },
    []
  );

  const createPost = useCallback(
    async (post: CreatePostInput): Promise<{ data: Post | null; error: string | null }> => {
      const errors = validatePostInput(post);
      if (hasValidationErrors(errors)) {
        const firstError = Object.values(errors)[0]!;
        return { data: null, error: firstError };
      }
      if (post.embedded_links != null) {
        const linkError = validateEmbeddedLinks(post.embedded_links);
        if (linkError) return { data: null, error: linkError };
      }

      try {
        const auth = await requireAuth();
        if (auth.error) return { data: null, error: auth.error };
        const user = auth.user!;

        const { data, error } = await withRetry(async () =>
          supabase
            .from('posts')
            .insert([{ ...post, user_id: user.id }])
            .select()
            .single()
        );

        if (error) throw error;
        const postData = data as Post;

        if (postData) {
          postsCache.invalidateAll();
          const enrichedPost: Post = {
            ...postData,
            reactions: {},
            user_reactions: [],
            content_truncated: false,
            profile_display_name: null,
            profile_avatar_url: null,
          };
          setPosts((prev) => [enrichedPost, ...prev]);
        }
        return { data: postData, error: null };
      } catch (err) {
        return { data: null, error: toUserMessage(err) };
      }
    },
    []
  );

  const updatePost = useCallback(
    async (
      id: string,
      updates: Partial<CreatePostInput>
    ): Promise<{ data: Post | null; error: string | null }> => {
      const auth = await requireAuth();
      if (auth.error) return { data: null, error: auth.error };
      const user = auth.user!;

      const errors = validatePostInput(updates);
      if (hasValidationErrors(errors)) {
        return { data: null, error: Object.values(errors)[0]! };
      }
      if (updates.embedded_links != null) {
        const linkError = validateEmbeddedLinks(updates.embedded_links);
        if (linkError) return { data: null, error: linkError };
      }

      try {
        const { data, error } = await withRetry(async () =>
          supabase
            .from('posts')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()
        );

        if (error) throw error;
        const postData = data as Post;

        if (postData) {
          postsCache.invalidateAll();
          setPosts((prev) =>
            prev.map((post) =>
              post.id === id ? { ...post, ...postData, content_truncated: false } : post
            )
          );
        }
        return { data: postData, error: null };
      } catch (err) {
        return { data: null, error: toUserMessage(err) };
      }
    },
    []
  );

  const deletePost = useCallback(async (id: string): Promise<{ error: string | null }> => {
    try {
      const auth = await requireAuth();
      if (auth.error) return { error: auth.error };
      const user = auth.user!;

      const { error } = await withRetry(async () =>
        supabase.from('posts').delete().eq('id', id).eq('user_id', user.id)
      );
      if (error) throw error;
      postsCache.invalidateAll();
      setPosts((prev) => prev.filter((post) => post.id !== id));
      return { error: null };
    } catch (err) {
      return { error: toUserMessage(err) };
    }
  }, []);

  const fetchPost = useCallback(
    async (postId: string): Promise<Post | null> => {
      if (!currentUserId) return null;
      const requestedUserId = currentUserId;

      try {
        const { data, error: rpcError } = await withRetry(async () =>
          supabase.rpc('get_post_by_id', {
            p_post_id: postId,
          })
        );

        if (rpcError) throw rpcError;
        if (activeUserIdRef.current !== requestedUserId) return null;

        const rows = (data as Post[]) ?? [];
        if (rows.length === 0) return null;

        return normalizePost(rows[0]!);
      } catch (err) {
        console.error('Error fetching post:', toUserMessage(err));
        return null;
      }
    },
    [currentUserId]
  );

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMoreError,
    createPost,
    updatePost,
    deletePost,
    loadMore,
    refetch,
    applyOptimisticReaction,
    fetchPost,
  };
}
