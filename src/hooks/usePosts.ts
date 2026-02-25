import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errors';
import { withRetry } from '../lib/retry';
import { postsCache } from '../lib/cache';
import {
  validatePostInput,
  validateEmbeddedLinks,
  hasValidationErrors,
} from '../lib/validation';
import type { Post, CreatePostInput } from '../types/post';

const PAGE_SIZE = 20;

function cacheKey(
  userId: string | null,
  cursor: string | null,
): string {
  return `${userId ?? 'anon'}:${cursor ?? 'initial'}`;
}

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  /** Error from pagination (loadMore) — shown inline, not full-page */
  loadMoreError: string | null;
  createPost: (
    post: CreatePostInput,
  ) => Promise<{ data: Post | null; error: string | null }>;
  updatePost: (
    id: string,
    updates: Partial<CreatePostInput>,
  ) => Promise<{ data: Post | null; error: string | null }>;
  deletePost: (id: string) => Promise<{ error: string | null }>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  /** Optimistically update reactions for a single post (no server round-trip). */
  applyOptimisticReaction: (
    postId: string,
    emoji: string,
    userId: string,
    wasActive: boolean,
  ) => void;
  /** M2: Fetch a single post with full content (for view/edit modes). */
  fetchPost: (postId: string) => Promise<Post | null>;
}

export function usePosts(): UsePostsReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  // L4 FIX: Use a ref guard for loadMore instead of the `loadingMore` state.
  // On iPhone momentum scroll, the virtualizer can fire loadMore rapidly.
  // React state updates are async — the second call may see stale `false`
  // before the first call's `setLoadingMore(true)` flushes.
  const loadingMoreRef = useRef<boolean>(false);

  // ── Core fetch ─────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean): Promise<void> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      userIdRef.current = userId;

      const key = cacheKey(userId, cursor);

      // Check cache (skip for explicit refetch which calls invalidateAll first)
      const cached = postsCache.get(key) as Post[] | undefined;
      if (cached) {
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

      // T3: Single RPC replaces the two-query waterfall (N+1 fix)
      const { data, error: rpcError } = await withRetry(async () =>
        supabase.rpc('get_posts_with_reactions', {
          p_cursor: cursor,
          p_limit: PAGE_SIZE,
          p_user_id: userId,
        }),
      );

      if (rpcError) throw rpcError;

      const page = ((data as Post[]) ?? []).map((p) => ({
        ...p,
        // Ensure reactions/user_reactions are always present for UI
        reactions: (p.reactions as Record<string, number>) ?? {},
        user_reactions: (p.user_reactions as string[]) ?? [],
      }));

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
    [],
  );

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        cursorRef.current = null;
        if (!cancelled) await fetchPage(null, false);
      } catch (err) {
        if (!cancelled) setError(toUserMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  // ── Load more (pagination) ─────────────────────────────────────────────
  const loadMore = useCallback(async (): Promise<void> => {
    // L4 FIX: Check the ref (synchronous) instead of stale state closure.
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadMoreError(null);
    try {
      setLoadingMore(true);
      await fetchPage(cursorRef.current, true);
    } catch (err) {
      // UX: Use separate state so pagination errors show inline, not full-page
      setLoadMoreError(toUserMessage(err));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore]);

  // ── Refetch (force bypass cache) ────────────────────────────────────────
  const refetch = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      postsCache.invalidateAll();
      cursorRef.current = null;
      setHasMore(true);
      await fetchPage(null, false);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  // ── T4: Optimistic reaction update ──────────────────────────────────────
  const applyOptimisticReaction = useCallback(
    (
      postId: string,
      emoji: string,
      _userId: string,
      wasActive: boolean,
    ): void => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const currentCount = post.reactions?.[emoji] ?? 0;
          const newReactions = {
            ...post.reactions,
            [emoji]: wasActive
              ? Math.max(0, currentCount - 1)
              : currentCount + 1,
          };
          if (newReactions[emoji] === 0) delete newReactions[emoji];

          const currentUserReactions = post.user_reactions ?? [];
          const newUserReactions = wasActive
            ? currentUserReactions.filter((r) => r !== emoji)
            : [...currentUserReactions, emoji];

          return {
            ...post,
            reactions: newReactions,
            user_reactions: newUserReactions,
          };
        }),
      );
      // Invalidate cache so a hard refetch sees the latest
      postsCache.invalidateAll();
    },
    [],
  );

  // ── createPost ─────────────────────────────────────────────────────────
  const createPost = useCallback(
    async (
      post: CreatePostInput,
    ): Promise<{ data: Post | null; error: string | null }> => {
      // T3: Client-side validation
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
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user)
          return {
            data: null,
            error: 'You must be logged in to create a post',
          };
        const user = session.user;

        const { data, error } = await supabase
          .from('posts')
          .insert([{ ...post, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;
        const postData = data as Post;

        if (postData) {
          postsCache.invalidateAll();
          // F1 FIX: The direct .insert().select() response lacks the joined
          // fields that get_posts_with_reactions returns (profile info, reactions).
          // Fill in defaults so PostCard renders correctly until the next
          // full refetch pulls the RPC-enriched data.
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
    [],
  );

  // ── updatePost ─────────────────────────────────────────────────────────
  const updatePost = useCallback(
    async (
      id: string,
      updates: Partial<CreatePostInput>,
    ): Promise<{ data: Post | null; error: string | null }> => {
      // T3: Defensive ownership check
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user)
        return {
          data: null,
          error: 'You must be logged in to edit a post',
        };
      const user = session.user;

      // T3: Validate updates
      const errors = validatePostInput(updates);
      if (hasValidationErrors(errors)) {
        return { data: null, error: Object.values(errors)[0]! };
      }
      if (updates.embedded_links != null) {
        const linkError = validateEmbeddedLinks(updates.embedded_links);
        if (linkError) return { data: null, error: linkError };
      }

      try {
        // H3 FIX: Include user_id in WHERE clause as defense-in-depth.
        // Even if RLS policies enforce ownership, this ensures the query
        // can't modify another user's post if RLS is misconfigured.
        const { data, error } = await supabase
          .from('posts')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        const postData = data as Post;

        if (postData) {
          postsCache.invalidateAll();
          // After editing, the local post has full content — not truncated
          setPosts((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, ...postData, content_truncated: false }
                : p,
            ),
          );
        }
        return { data: postData, error: null };
      } catch (err) {
        return { data: null, error: toUserMessage(err) };
      }
    },
    [],
  );

  // ── deletePost ─────────────────────────────────────────────────────────
  const deletePost = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user)
          return { error: 'You must be logged in to delete a post' };
        const user = session.user;

        // H3 FIX: Include user_id as defense-in-depth (same as updatePost).
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
        postsCache.invalidateAll();
        setPosts((prev) => prev.filter((p) => p.id !== id));
        return { error: null };
      } catch (err) {
        return { error: toUserMessage(err) };
      }
    },
    [],
  );

  // ── M2: fetchPost (single post with full content) ──────────────────────
  const fetchPost = useCallback(
    async (postId: string): Promise<Post | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;

        const { data, error: rpcError } = await withRetry(async () =>
          supabase.rpc('get_post_by_id', {
            p_post_id: postId,
            p_user_id: userId,
          }),
        );

        if (rpcError) throw rpcError;

        const rows = (data as Post[]) ?? [];
        if (rows.length === 0) return null;

        const post = rows[0]!;
        return {
          ...post,
          reactions: (post.reactions as Record<string, number>) ?? {},
          user_reactions: (post.user_reactions as string[]) ?? [],
        };
      } catch {
        return null;
      }
    },
    [],
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
