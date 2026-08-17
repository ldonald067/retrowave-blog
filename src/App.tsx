import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAuth } from './hooks/useAuth';
import { usePosts } from './hooks/usePosts';
import { useToast } from './hooks/useToast';
import { useReactions } from './hooks/useReactions';
import { useBlocks } from './hooks/useBlocks';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CursorSparkle from './components/CursorSparkle';
import ChapterChips from './components/ChapterChips';
import PostCard from './components/PostCard';
import LoadingSpinner from './components/LoadingSpinner';
import PostSkeleton, { SidebarSkeleton } from './components/PostSkeleton';
import EmptyState from './components/EmptyState';
import ErrorMessage from './components/ErrorMessage';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import type { Post, CreatePostInput } from './types/post';
import type { Profile } from './types/profile';
import { useEmojiStyle, getEmojiAttribution } from './lib/emojiStyles';
import { moderateContent } from './lib/moderation';
import { toUserMessage } from './lib/errors';
import { withRetry } from './lib/retry';
import { SUCCESS_MESSAGES } from './lib/constants';
import { supabase } from './lib/supabase';
import { hideSplashScreen, hapticImpact } from './lib/capacitor';
import { AUTH_CALLBACK_ERROR } from './lib/auth-callback';
import NewPasswordModal from './components/NewPasswordModal';
import { sparkleBurst, emojiRain } from './lib/celebrations';
import { Input, Select, Windows95MyComputer, Windows95Notepad } from './components/ui';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useChapters } from './hooks/useChapters';
import { isSameChapter, isChapterPrivate } from './utils/chapterPrivacy';
import { computeFeedHeight, feedMaxHeight } from './utils/feedHeight';

// Lazy-load heavy modal/overlay components — only fetched when needed
const PostModal = lazy(() => import('./components/PostModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const AgeVerification = lazy(() => import('./components/AgeVerification'));
const PublicProfileView = lazy(() => import('./components/PublicProfileView'));
const ModerationView = lazy(() => import('./components/ModerationView'));

type ModalMode = 'create' | 'edit' | 'view';
type VisibilityFilter = 'all' | 'private' | 'public';
type MusicFilter = 'all' | 'with-music';
type SortFilter = 'newest' | 'recently-edited';

const VISIBILITY_FILTER_OPTIONS = [
  { value: 'all', label: 'all entries' },
  { value: 'private', label: 'private only' },
  { value: 'public', label: 'public only' },
] as const;

const MUSIC_FILTER_OPTIONS = [
  { value: 'all', label: 'all music states' },
  { value: 'with-music', label: 'with music' },
] as const;

const SORT_FILTER_OPTIONS = [
  { value: 'newest', label: 'newest first' },
  { value: 'recently-edited', label: 'recently edited' },
] as const;

type FeedPreferenceState = {
  visibilityFilter: VisibilityFilter;
  musicFilter: MusicFilter;
  moodFilter: string;
  sortFilter: SortFilter;
};

type ActiveFeedFilterKey = 'search' | 'chapter' | 'visibility' | 'music' | 'mood' | 'sort';

const FEED_PREFERENCES_KEY = 'feed-preferences';

function loadFeedPreferences(): Partial<FeedPreferenceState> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(FEED_PREFERENCES_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Partial<FeedPreferenceState>;
    return {
      visibilityFilter:
        parsed.visibilityFilter === 'private' || parsed.visibilityFilter === 'public'
          ? parsed.visibilityFilter
          : 'all',
      musicFilter: parsed.musicFilter === 'with-music' ? 'with-music' : 'all',
      moodFilter: typeof parsed.moodFilter === 'string' ? parsed.moodFilter : '',
      sortFilter: parsed.sortFilter === 'recently-edited' ? 'recently-edited' : 'newest',
    };
  } catch {
    return {};
  }
}

/** Parse #/u/username from URL hash */
function getPublicUsername(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#\/u\/([a-zA-Z0-9_-]+)$/);
  return match?.[1] ?? null;
}

/**
 * Parse #/report/<uuid> from the URL hash — the link in the report email.
 *
 * The id carries no authority: the screen it opens is gated on the signed-in
 * profile's is_admin, and every RPC behind it re-checks is_admin() server-side.
 * A prefetched or forwarded link therefore grants nothing, which is why this is
 * a plain deep link rather than a signed action URL.
 */
function getReportRoute(): string | null {
  const match = window.location.hash.match(/^#\/report\/([0-9a-fA-F-]{36})$/);
  return match?.[1] ?? null;
}

/** Minimal fallback shown while lazy chunks load */
function LazyFallback() {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-center p-2 sm:p-4 modal-overlay-safe">
      <LoadingSpinner fullScreen={false} />
    </div>
  );
}

/** Virtualized post list — only renders posts visible in viewport */
const VIRTUAL_OVERSCAN = 3;
const ESTIMATED_POST_HEIGHT = 380;

function PostList({
  posts,
  onView,
  onReaction,
  onBlock,
  onChapterClick,
  currentUserId,
  onLoadMore,
  loadingMore,
  hasMore,
  loadMoreError,
}: {
  posts: Post[];
  onView: (post: Post) => void;
  onReaction?: (postId: string, emoji: string) => void;
  onBlock?: (userId: string) => void;
  onChapterClick?: (chapter: string) => void;
  currentUserId?: string;
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreError?: string | null;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const prevCountRef = useRef(posts.length);
  useEffect(() => {
    if (posts.length > prevCountRef.current) {
      const newCount = posts.length - prevCountRef.current;
      setSrAnnouncement(`${newCount} more ${newCount === 1 ? 'post' : 'posts'} loaded`);
    }
    prevCountRef.current = posts.length;
  }, [posts.length]);

  // eslint-disable-next-line react-hooks/incompatible-library -- tanstack-virtual is not React Compiler compatible; this only skips compiler optimization here
  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_POST_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
  });

  // Infinite scroll: auto-load when sentinel enters viewport
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) onLoadMore();
  }, [hasMore, loadingMore, onLoadMore]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore();
      },
      { root: parentRef.current, rootMargin: '0px 0px 200px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  // Dynamically compute available height instead of hardcoding calc(100dvh - 200px).
  // This accounts for variable header/sidebar/chips height above the feed.
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const computeHeight = () => {
      if (!parentRef.current) return;
      const rect = parentRef.current.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      setContainerHeight(computeFeedHeight(viewportHeight, rect.top));
    };

    // The feed's top moves with ordinary document scrolling, and none of the
    // other signals fire for that: resize/orientation do not, visualViewport
    // scroll is unreliable for the layout viewport, and ResizeObserver reports
    // size, not position. Without this the height measured at mount — when the
    // feed usually starts below the fold — would never be corrected.
    let queued = 0;
    const scheduleCompute = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        computeHeight();
      });
    };

    const initial = requestAnimationFrame(() => requestAnimationFrame(computeHeight));
    window.addEventListener('scroll', scheduleCompute, { passive: true });
    window.addEventListener('resize', computeHeight);
    window.addEventListener('orientationchange', computeHeight);
    window.visualViewport?.addEventListener('resize', computeHeight);
    window.visualViewport?.addEventListener('scroll', computeHeight);
    const observer = new ResizeObserver(computeHeight);
    if (parentRef.current?.parentElement) observer.observe(parentRef.current.parentElement);
    return () => {
      cancelAnimationFrame(initial);
      if (queued) cancelAnimationFrame(queued);
      window.removeEventListener('scroll', scheduleCompute);
      window.removeEventListener('resize', computeHeight);
      window.removeEventListener('orientationchange', computeHeight);
      window.visualViewport?.removeEventListener('resize', computeHeight);
      window.visualViewport?.removeEventListener('scroll', computeHeight);
      observer.disconnect();
    };
  }, []);

  return (
    <div>
      {/* Screen reader announcement for infinite scroll */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </div>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{
          maxHeight: feedMaxHeight(containerHeight),
          scrollbarWidth: 'thin',
        }}
      >
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const post = posts[virtualRow.index];
            if (!post) return null;
            return (
              <div
                key={post.id}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full pb-4"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <PostCard
                  post={post}
                  onView={onView}
                  onReaction={onReaction}
                  onBlock={onBlock}
                  onChapterClick={onChapterClick}
                  currentUserId={currentUserId}
                />
              </div>
            );
          })}
        </div>

        {/* Inline error for pagination failures */}
        {loadMoreError && (
          <div className="xanga-box p-3 mt-4 text-center">
            <p
              className="text-xs"
              style={{ color: 'var(--accent-secondary)', fontFamily: 'var(--title-font)' }}
            >
              ❌ {loadMoreError}
            </p>
            <button onClick={onLoadMore} className="xanga-link text-xs mt-2">
              ~ try again ~
            </button>
          </div>
        )}

        {/* Infinite scroll sentinel + fallback manual button */}
        {hasMore && !loadMoreError && (
          <div ref={loadMoreRef} className="flex justify-center pt-4 pb-2">
            <button onClick={onLoadMore} disabled={loadingMore} className="xanga-button text-sm">
              {loadingMore ? 'Loading...' : '\u00AB Older Entries'}
            </button>
          </div>
        )}

        {/* End-of-list indicator */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-3 sm:py-6">
            <p
              className="text-xs"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
            >
              ~ that's all for now! ~
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              ✨ u've reached the end of the feed ✨
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  // ── Public profile routing via hash ──────────────────────────────────────
  const [publicUsername, setPublicUsername] = useState<string | null>(getPublicUsername);
  const [reportRoute, setReportRoute] = useState<string | null>(getReportRoute);
  useEffect(() => {
    const onHashChange = () => {
      setPublicUsername(getPublicUsername());
      setReportRoute(getReportRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Entering or leaving the public view swaps the whole page; reset the scroll
  // so the incoming page starts at the top rather than inheriting the outgoing
  // one's offset. Runs after paint — at effect time the incoming page has not
  // laid out, so the scroll is still clamped to the old document height.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, 0)));
    return () => cancelAnimationFrame(id);
  }, [publicUsername]);

  const {
    user,
    profile,
    profileError,
    loading: authLoading,
    signOut,
    updateProfile,
    refetchProfile,
    passwordRecovery,
    clearPasswordRecovery,
  } = useAuth();
  const {
    posts,
    loading: postsLoading,
    loadingMore,
    hasMore,
    error,
    createPost,
    updatePost,
    deletePost,
    loadMore,
    loadMoreError,
    refetch,
    applyOptimisticReaction,
    fetchPost,
  } = usePosts(user?.id ?? null);
  const { toasts, hideToast, success, error: showError } = useToast();
  const { toggleReaction } = useReactions({
    onOptimisticUpdate: applyOptimisticReaction,
  });

  // A confirmation link that has expired or been used already fails silently
  // otherwise: the deep link reopens the app, no session is created, and the
  // signup screen comes back with no explanation for why.
  useEffect(() => {
    const onCallbackError = (e: Event) => showError((e as CustomEvent<string>).detail);
    window.addEventListener(AUTH_CALLBACK_ERROR, onCallbackError);
    return () => window.removeEventListener(AUTH_CALLBACK_ERROR, onCallbackError);
  }, [showError]);

  // Rendered above everything, including the auth modal: a recovery link
  // establishes a session, so without this the app would look like an ordinary
  // sign-in and never ask for the new password the email promised.
  const newPasswordLayer = passwordRecovery ? (
    <NewPasswordModal
      onDone={(message) => {
        clearPasswordRecovery();
        success(message);
      }}
    />
  ) : null;

  const { chapters, refetch: refetchChapters } = useChapters(user?.id ?? null);
  const LOOSE_ENTRIES = '__loose__';
  const [chapterFilter, setChapterFilter] = useState<string | null>(null);

  const { toggleBlock } = useBlocks();
  // State for block confirmation dialog
  const [userToBlock, setUserToBlock] = useState<string | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');
  const [ageVerifying, setAgeVerifying] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>(
    () => loadFeedPreferences().visibilityFilter ?? 'all'
  );
  const [musicFilter, setMusicFilter] = useState<MusicFilter>(
    () => loadFeedPreferences().musicFilter ?? 'all'
  );
  const [moodFilter, setMoodFilter] = useState(() => loadFeedPreferences().moodFilter ?? '');
  const [sortFilter, setSortFilter] = useState<SortFilter>(
    () => loadFeedPreferences().sortFilter ?? 'newest'
  );
  const [openComposerAfterProfileSetup, setOpenComposerAfterProfileSetup] = useState(false);
  // Subscribe to emoji style changes for footer attribution
  const emojiStyle = useEmojiStyle();
  const isOnline = useOnlineStatus();

  // UX: Show toast when profile creation/fetch fails silently
  const profileErrorShownRef = useRef(false);
  useEffect(() => {
    if (profileError && !profileErrorShownRef.current) {
      profileErrorShownRef.current = true;
      showError(profileError);
    }
  }, [profileError, showError]);

  // Hide native splash screen once auth state is resolved
  useEffect(() => {
    if (!authLoading) void hideSplashScreen();
  }, [authLoading]);

  // Show auth modal if not authenticated — adjusted during render on auth
  // transitions (not every render, so the user can still dismiss the modal).
  const [prevAuth, setPrevAuth] = useState({ authLoading, user });
  if (prevAuth.authLoading !== authLoading || prevAuth.user !== user) {
    setPrevAuth({ authLoading, user });
    if (!authLoading && !user) {
      setShowAuthModal(true);
      setAuthModalTab('signup'); // Default to signup for new users
    }
  }

  // Filter posts by chapter (client-side) — memoized to avoid re-filtering on every render
  const looseCount = useMemo(() => posts.filter((p) => !p.chapter).length, [posts]);
  const chapterFilteredPosts = useMemo(
    () =>
      chapterFilter === LOOSE_ENTRIES
        ? posts.filter((p) => !p.chapter)
        : chapterFilter
          ? posts.filter((p) => p.chapter === chapterFilter)
          : posts,
    [posts, chapterFilter, LOOSE_ENTRIES]
  );
  const moodOptions = useMemo(
    () =>
      Array.from(
        new Set(
          posts.map((post) => post.mood?.trim()).filter((mood): mood is string => Boolean(mood))
        )
      )
        .sort((a, b) => a.localeCompare(b))
        .map((mood) => ({ value: mood, label: mood })),
    [posts]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FEED_PREFERENCES_KEY,
        JSON.stringify({
          visibilityFilter,
          musicFilter,
          moodFilter,
          sortFilter,
        } satisfies FeedPreferenceState)
      );
    } catch {
      // Private browsing or storage restrictions — ignore.
    }
  }, [visibilityFilter, musicFilter, moodFilter, sortFilter]);

  // Clear a mood filter that no longer matches any post — guarded render
  // adjustment, converges in one pass.
  if (moodFilter && !moodOptions.some((option) => option.value === moodFilter)) {
    setMoodFilter('');
  }

  const visiblePosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const nextPosts = chapterFilteredPosts.filter((post) => {
      if (visibilityFilter === 'private' && !post.is_private) return false;
      if (visibilityFilter === 'public' && post.is_private) return false;
      if (musicFilter === 'with-music' && !post.music?.trim()) return false;
      if (moodFilter && post.mood !== moodFilter) return false;
      if (!query) return true;

      const haystack = [post.title, post.content, post.author, post.chapter, post.mood, post.music]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    return [...nextPosts].sort((left, right) => {
      if (sortFilter === 'recently-edited') {
        return (
          new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime() ||
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        );
      }
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }, [chapterFilteredPosts, searchQuery, visibilityFilter, musicFilter, moodFilter, sortFilter]);
  const hasFeedFilters = Boolean(
    searchQuery.trim() ||
    visibilityFilter !== 'all' ||
    musicFilter !== 'all' ||
    moodFilter ||
    sortFilter !== 'newest'
  );

  const handleChapterClick = useCallback((chapter: string) => {
    setChapterFilter((prev) => (prev === chapter ? null : chapter));
  }, []);

  const clearFeedFilters = useCallback(() => {
    setSearchQuery('');
    setVisibilityFilter('all');
    setMusicFilter('all');
    setMoodFilter('');
    setSortFilter('newest');
  }, []);

  const clearAllFilters = useCallback(() => {
    setChapterFilter(null);
    clearFeedFilters();
  }, [clearFeedFilters]);

  const activeFeedFilters = useMemo(() => {
    const nextFilters: Array<{ key: ActiveFeedFilterKey; label: string }> = [];

    if (chapterFilter) {
      nextFilters.push({
        key: 'chapter',
        label: chapterFilter === LOOSE_ENTRIES ? 'loose entries' : `chapter: ${chapterFilter}`,
      });
    }

    if (searchQuery.trim()) {
      nextFilters.push({ key: 'search', label: `search: "${searchQuery.trim()}"` });
    }

    if (visibilityFilter === 'private') {
      nextFilters.push({ key: 'visibility', label: 'private only' });
    } else if (visibilityFilter === 'public') {
      nextFilters.push({ key: 'visibility', label: 'public only' });
    }

    if (musicFilter === 'with-music') {
      nextFilters.push({ key: 'music', label: 'with music' });
    }

    if (moodFilter) {
      nextFilters.push({ key: 'mood', label: `mood: ${moodFilter}` });
    }

    if (sortFilter === 'recently-edited') {
      nextFilters.push({ key: 'sort', label: 'recently edited' });
    }

    return nextFilters;
  }, [
    chapterFilter,
    searchQuery,
    visibilityFilter,
    musicFilter,
    moodFilter,
    sortFilter,
    LOOSE_ENTRIES,
  ]);

  const clearSingleFeedFilter = useCallback((key: ActiveFeedFilterKey) => {
    switch (key) {
      case 'chapter':
        setChapterFilter(null);
        return;
      case 'search':
        setSearchQuery('');
        return;
      case 'visibility':
        setVisibilityFilter('all');
        return;
      case 'music':
        setMusicFilter('all');
        return;
      case 'mood':
        setMoodFilter('');
        return;
      case 'sort':
        setSortFilter('newest');
        return;
      default:
        return;
    }
  }, []);

  const activeFeedSummaryText = useMemo(() => {
    if (activeFeedFilters.length === 0) {
      return 'showing your full archive';
    }

    return `filtered by ${activeFeedFilters.map((filter) => filter.label).join(' + ')}`;
  }, [activeFeedFilters]);

  const archiveEmptyStateText = useMemo(() => {
    if (activeFeedFilters.length === 0) {
      return 'no entries match this view yet';
    }

    return `nothing matches ${activeFeedFilters.map((filter) => filter.label).join(' + ')}`;
  }, [activeFeedFilters]);

  const toggleChapterPrivacy = useCallback(
    async (chapter: string) => {
      if (!profile) return;
      const current = profile.private_chapters ?? [];
      // Match the normalized comparison get_public_profile uses (see
      // 20260729030000): "Therapy", "therapy" and " Therapy " are one chapter.
      // Exact matching here would let a case variant silently unmark a chapter
      // in the UI while the server still treated it as private, or vice versa.
      const isPrivate = current.some((c) => isSameChapter(c, chapter));
      const updated = isPrivate
        ? current.filter((c) => !isSameChapter(c, chapter))
        : [...current, chapter];
      const { error: err } = await updateProfile({ private_chapters: updated });
      if (err) {
        showError(`~ ${err} ~`);
      } else {
        success(isPrivate ? '📖 chapter is now public ~' : '🔒 chapter is now private ~');
      }
    },
    [profile, updateProfile, showError, success]
  );

  const handleNewPost = useCallback(() => {
    if (!user) {
      showError('~ sign in 2 write entries! ~');
      setShowAuthModal(true);
      return;
    }
    setSelectedPost(null);
    setModalMode('create');
    setShowModal(true);
  }, [user, showError]);

  // Keyboard shortcut: Ctrl+N / Cmd+N → new post (desktop only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        // Skip if user is typing in an input/textarea
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        // Skip if any modal is open
        if (showModal || showProfileModal || showSettingsModal) return;
        // Skip if not authenticated
        if (!user) return;
        e.preventDefault();
        handleNewPost();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, showModal, showProfileModal, showSettingsModal, handleNewPost]);

  const handleViewPost = useCallback((post: Post) => {
    setSelectedPost(post);
    setModalMode('view');
    setShowModal(true);
  }, []);

  const handleEditPost = useCallback((post: Post) => {
    setSelectedPost(post);
    setModalMode('edit');
    setShowModal(true);
  }, []);

  const handleDeletePost = useCallback(
    (post: Post) => {
      if (!user) {
        showError('~ sign in 2 delete entries! ~');
        setShowAuthModal(true);
        return;
      }
      // Leave the composer mounted and selectedPost intact. ConfirmDialog is
      // z-[60] against the modal overlay's z-50, so it renders above the
      // composer without anything being closed — and cancelling therefore
      // returns the user to their unsaved edits instead of discarding them.
      // Edit-mode drafts are not persisted, so tearing the composer down here
      // would silently destroy whatever they had just written.
      setPostToDelete(post);
    },
    [user, showError]
  );

  const confirmDeletePost = useCallback(async () => {
    if (!postToDelete) return;
    setDeleteLoading(true);
    const { error } = await deletePost(postToDelete.id);
    setDeleteLoading(false);
    if (error) {
      // Leave the composer open on failure — the entry still exists, and any
      // unsaved edits in it are still the user's only copy.
      showError('~ couldnt delete that :( try again ~');
    } else {
      void hapticImpact();
      success(SUCCESS_MESSAGES.post.deleted);
      void refetchChapters(); // Last post in a chapter may have been deleted
      // Only now is it safe to tear the composer down: the entry is gone, so
      // there is nothing left to save into. This also prevents the old bug where
      // a still-mounted composer with post=null fell through to createPost and
      // resurrected the deleted entry.
      setSelectedPost(null);
      setShowModal(false);
    }
    setPostToDelete(null);
  }, [postToDelete, deletePost, showError, success, refetchChapters]);

  const handleSavePost = async (postData: CreatePostInput) => {
    // Guard against a stale edit session: if the entry vanished (e.g. it was
    // deleted from inside the composer), never silently fall through to create.
    if (modalMode === 'edit' && !selectedPost) {
      showError('~ that entry is gone ~');
      throw new Error('stale edit session');
    }

    // Moderation exists to protect people who READ an entry. A private entry has
    // no audience, and the edge function forwards the text to OpenAI — so running
    // it on a private entry would ship the user's diary to a third party for no
    // benefit. Public entries are moderated on create, and a private entry is
    // moderated the moment an edit makes it public (is_private flips to false).
    // "Externally visible" is not is_private alone. An entry with is_private
    // false that sits in a private chapter is hidden from the public page by
    // get_public_profile — so treating it as public here would ship a chapter
    // the user marked private to OpenAI. Mirror the server's rule.
    const willBePubliclyVisible =
      !postData.is_private && !isChapterPrivate(profile?.private_chapters, postData.chapter);

    if (willBePubliclyVisible) {
      // Run AI moderation before saving. quickContentCheck already ran
      // in PostModal (instant local feedback), but this calls the edge function
      // for full OpenAI moderation. Fail-open: if the service is down, the post
      // goes through (local regex already passed).
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      // Fold public user-authored fields (author name, music) into the moderated
      // text so they can't bypass the AI check the way title/content can't.
      const moderatedContent = [postData.content, postData.author, postData.music]
        .filter(Boolean)
        .join('\n');
      const modResult = await moderateContent(
        postData.title,
        moderatedContent,
        null,
        supabaseUrl,
        async () => {
          const { data } = await supabase.auth.getSession();
          return data.session?.access_token ?? null;
        }
      );
      if (!modResult.allowed) {
        showError(modResult.reason || '~ content violates community guidelines ~');
        throw new Error(modResult.reason || 'Content blocked by moderation');
      }
    }

    if (modalMode === 'edit' && selectedPost) {
      const { error } = await updatePost(selectedPost.id, postData);
      if (error) {
        showError('~ couldnt save that :( try again ~');
        // Throw so PostModal keeps the modal open and preserves the draft
        // (it only clears the draft on a resolved save).
        throw new Error(error);
      }
      void hapticImpact();
      success(postData.is_private ? '~ private changes saved ~' : SUCCESS_MESSAGES.post.updated);
    } else {
      const { error } = await createPost(postData);
      if (error) {
        showError('~ couldnt post that :( try again ~');
        // Throw so PostModal keeps the modal open and preserves the draft.
        throw new Error(error);
      }
      void hapticImpact();
      // Fewer particles on mobile to avoid frame drops on older phones
      const isMobile = window.innerWidth < 640;
      sparkleBurst(undefined, undefined, isMobile ? 6 : 12);
      emojiRain(['✨', '💕', '📝', '⭐'], isMobile ? 6 : 12);
      const entryMightBeHiddenByCurrentView = chapterFilter !== null || hasFeedFilters;
      success(
        postData.is_private
          ? entryMightBeHiddenByCurrentView
            ? '~ private entry saved. clear filters if u dont see it ~'
            : '~ private entry saved just for you ~'
          : entryMightBeHiddenByCurrentView
            ? '✨ ur entry is live! clear filters if u dont see it ✨'
            : SUCCESS_MESSAGES.post.created
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Also update profile mood/music if provided — but only from a PUBLIC entry.
      // current_mood/current_music are rendered on the public profile page, so
      // copying them off a private entry would broadcast what the user just wrote
      // privately ("feeling: heartbroken") to anyone holding their public link.
      // Same rule as the moderation guard above: an entry hidden by its chapter
      // must not push its mood/music onto the publicly rendered profile.
      if (willBePubliclyVisible && (postData.mood || postData.music)) {
        const profileUpdates: Record<string, string | null> = {};
        if (postData.mood) profileUpdates.current_mood = postData.mood;
        if (postData.music) profileUpdates.current_music = postData.music;
        await updateProfile(profileUpdates);
      }
    }
    setShowModal(false);
    // Refresh chapter list — user may have added/changed/removed a chapter
    void refetchChapters();
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      showError('~ couldnt sign out :( try again ~');
    } else {
      success(SUCCESS_MESSAGES.auth.signedOut);
      setShowAuthModal(true);
    }
  };

  // Ref keeps current posts so handleReaction's identity stays stable
  // (no `posts` in deps → PostCard memo won't re-render on feed change).
  // Written in an effect, not during render, so discarded concurrent
  // renders never leak into the ref.
  const postsRef = useRef(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // T4: Optimistic reactions — no more refetch() after toggle
  // Wrapped in useCallback so PostCard (React.memo) doesn't re-render on every App render
  const handleReaction = useCallback(
    async (postId: string, emoji: string) => {
      if (!user) {
        showError('~ sign in 2 react! ~');
        setShowAuthModal(true);
        return;
      }
      const post = postsRef.current.find((p) => p.id === postId);
      const currentUserReactions = post?.user_reactions ?? [];

      const { error } = await toggleReaction(postId, emoji, currentUserReactions);
      if (error) {
        showError(error);
        // Note: useReactions already rolled back the optimistic update on error
      }
    },
    [user, toggleReaction, showError]
  );

  // Apple Guideline 1.2: Block user — shows confirm dialog, then blocks + refetches feed
  const handleBlock = useCallback((userId: string) => {
    setUserToBlock(userId);
  }, []);

  const confirmBlockUser = useCallback(async () => {
    if (!userToBlock) return;
    setBlockLoading(true);
    const { is_blocked, error: blockError } = await toggleBlock(userToBlock);
    setBlockLoading(false);
    if (blockError) {
      showError('~ couldnt block that user :( try again ~');
    } else {
      void hapticImpact();
      success(is_blocked ? SUCCESS_MESSAGES.block.blocked : SUCCESS_MESSAGES.block.unblocked);
      void refetch(); // Refresh feed to hide blocked user's posts
      void refetchChapters(); // Blocked user's posts hidden → chapter counts change
    }
    setUserToBlock(null);
  }, [userToBlock, toggleBlock, showError, success, refetch, refetchChapters]);

  const handleProfileClick = () => {
    if (!user) {
      showError('~ sign in 2 edit ur profile! ~');
      setShowAuthModal(true);
      return;
    }
    setShowProfileModal(true);
  };

  const needsProfileSetup = !!(user && profile && !profile.display_name);

  const handleSaveStatus = useCallback(
    async (statusMessage: string | null) => {
      const { error } = await updateProfile({ status_message: statusMessage });
      if (error) {
        showError(error.startsWith('~') ? error : `~ ${error} ~`);
      }
      return { error };
    },
    [updateProfile, showError]
  );

  const handleSaveProfile = useCallback(
    async (updates: Partial<Profile>) => {
      const { error } = await updateProfile(updates);
      if (!error && needsProfileSetup) {
        setOpenComposerAfterProfileSetup(true);
        setShowProfileModal(false);
      }
      return { error };
    },
    [updateProfile, needsProfileSetup]
  );

  // Open the composer once profile setup completes — guarded render
  // adjustment; resetting the flag makes the guard converge in one pass.
  if (openComposerAfterProfileSetup && !needsProfileSetup && user) {
    setSelectedPost(null);
    setModalMode('create');
    setShowModal(true);
    setOpenComposerAfterProfileSetup(false);
  }

  // If viewing own public profile, redirect to normal feed. An effect, not a
  // render-phase mutation: the hashchange event it triggers is async either way.
  useEffect(() => {
    if (publicUsername && user && profile?.username === publicUsername) {
      window.location.hash = '';
    }
  }, [publicUsername, user, profile?.username]);

  // Shared toast layer — rendered in every branch (including the auth-modal
  // and age-gate early returns) so toasts like "signed out" stay visible
  // instead of unmounting with the main app tree.
  const toastLayer = (
    <AnimatePresence>
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
          duration={toast.duration}
          index={index}
        />
      ))}
    </AnimatePresence>
  );

  // Admin moderation queue — opened by the "Review in app" link in the report
  // email. A non-admin who follows the link falls through to the normal app
  // rather than seeing an error, so the route does not confirm it exists.
  if (reportRoute && user && profile?.is_admin) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <ModerationView
          focusReportId={reportRoute}
          onGoHome={() => {
            window.location.hash = '';
          }}
        />
        {toastLayer}
        {newPasswordLayer}
      </Suspense>
    );
  }

  // Public profile view — no auth required, show read-only journal
  if (publicUsername && (!user || profile?.username !== publicUsername)) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <PublicProfileView
          username={publicUsername}
          isAuthenticated={!!user}
          onSignUp={() => {
            window.location.hash = '';
            setShowAuthModal(true);
          }}
          onGoHome={() => {
            window.location.hash = '';
          }}
        />
      </Suspense>
    );
  }

  // Show loading spinner during auth initialization
  if (authLoading) {
    return (
      <div className="min-h-screen themed-bg flex items-center justify-center safe-area-top page-safe-bottom px-4">
        <LoadingSpinner fullScreen={false} />
      </div>
    );
  }

  // Guard against age gate flash: profile fetch is async after session resolves.
  if (user && !profile && !profileError) {
    return (
      <div className="min-h-screen themed-bg flex items-center justify-center safe-area-top page-safe-bottom px-4">
        <LoadingSpinner fullScreen={false} />
      </div>
    );
  }

  // Show auth page if not authenticated (full-screen, not modal)
  if (!user && showAuthModal) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthModal
          isOpen={showAuthModal}
          defaultTab={authModalTab}
          onClose={() => setShowAuthModal(false)}
        />
        {toastLayer}
        {newPasswordLayer}
      </Suspense>
    );
  }

  // Show age verification if user is logged in but not verified
  if (user && profile && !profile.age_verified) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AgeVerification
          loading={ageVerifying}
          onVerified={async (birthYear: number, tosAccepted: boolean) => {
            if (ageVerifying) return; // guard against double-submit
            setAgeVerifying(true);
            try {
              // Set COPPA fields via RPC — direct updateProfile() is blocked
              // by the protect_coppa_fields trigger.
              const { error } = await withRetry(async () =>
                supabase.rpc('set_age_verification', {
                  p_birth_year: birthYear,
                  p_tos_accepted: tosAccepted,
                })
              );
              if (error) {
                showError(`~ ${toUserMessage(error)} ~`);
              } else {
                // Refresh profile to pick up the new COPPA values
                await refetchProfile();
                success('✨ verified! welcome 2 the club ~');
              }
            } finally {
              setAgeVerifying(false);
            }
          }}
          requireTOS={true}
        />
        {toastLayer}
        {newPasswordLayer}
      </Suspense>
    );
  }

  if (postsLoading) {
    return (
      <div className="min-h-screen themed-bg page-safe-bottom">
        <Header
          onNewPost={handleNewPost}
          user={user}
          profile={profile}
          onSignOut={handleSignOut}
          onAuthClick={() => setShowAuthModal(true)}
          onProfileClick={handleProfileClick}
          onSettingsClick={() => setShowSettingsModal(true)}
          onSaveStatus={handleSaveStatus}
        />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <SidebarSkeleton />
            <main className="flex-1 min-w-0">
              <PostSkeleton />
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen themed-bg page-safe-bottom">
        <Header
          onNewPost={handleNewPost}
          user={user}
          profile={profile}
          onSignOut={handleSignOut}
          onAuthClick={() => setShowAuthModal(true)}
          onProfileClick={handleProfileClick}
          onSettingsClick={() => setShowSettingsModal(true)}
          onSaveStatus={handleSaveStatus}
        />
        <ErrorMessage error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        {/* page-fab-clearance, not page-safe-bottom: this is the only page that
            renders the floating "new entry" button, and it needs that button's
            height reserved so the last line can be scrolled clear of it. */}
        <div className="min-h-screen themed-bg page-fab-clearance">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <CursorSparkle />
          <Header
            onNewPost={handleNewPost}
            user={user}
            profile={profile}
            onSignOut={handleSignOut}
            onAuthClick={() => setShowAuthModal(true)}
            onProfileClick={handleProfileClick}
            onSettingsClick={() => setShowSettingsModal(true)}
            onSaveStatus={handleSaveStatus}
          />

          {/* Offline banner */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="text-center text-xs py-2 font-bold overflow-hidden"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--accent-secondary) 20%, var(--bg-primary))',
                  color: 'var(--accent-secondary)',
                }}
              >
                📡 ~ ur offline rn ~ posts will load when u reconnect ✨
              </motion.div>
            )}
          </AnimatePresence>

          {/* Xanga-style sidebar layout */}
          <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              {/* Left Sidebar */}
              <Sidebar
                user={user}
                profile={profile}
                onEditProfile={handleProfileClick}
                postCount={posts.length}
                chapters={chapters}
                activeChapter={chapterFilter}
                onChapterSelect={setChapterFilter}
                looseCount={looseCount}
                looseKey={LOOSE_ENTRIES}
                privateChapters={profile?.private_chapters ?? []}
                onToggleChapterPrivacy={toggleChapterPrivacy}
              />

              {/* Mobile: horizontal chapter chips above feed */}
              <ChapterChips
                chapters={chapters}
                activeChapter={chapterFilter}
                onChapterSelect={setChapterFilter}
                postCount={posts.length}
                looseCount={looseCount}
                looseKey={LOOSE_ENTRIES}
                privateChapters={profile?.private_chapters ?? []}
              />

              {/* Main Content Area */}
              <main id="main-content" className="flex-1 min-w-0">
                {/* Chapter filter banner */}
                {chapterFilter &&
                  (() => {
                    const isRealChapter = chapterFilter !== LOOSE_ENTRIES;
                    const chapterIsPrivate =
                      isRealChapter && isChapterPrivate(profile?.private_chapters, chapterFilter);
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="xanga-box p-3 mb-4 flex items-center justify-between gap-2"
                      >
                        <span
                          className="text-xs font-bold min-w-0 flex-1 line-clamp-2"
                          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
                        >
                          {chapterFilter === LOOSE_ENTRIES
                            ? '🍃 loose entries'
                            : `${chapterIsPrivate ? '🔒' : '📖'} ${chapterFilter}`}
                          <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
                            ({visiblePosts.length} {visiblePosts.length === 1 ? 'entry' : 'entries'}
                            )
                          </span>
                        </span>
                        {/* gap-3: Apple asks for ~12pt between bezeled controls */}
                        <div className="flex items-center justify-end gap-3 flex-shrink-0">
                          {isRealChapter && (
                            <button
                              onClick={() => toggleChapterPrivacy(chapterFilter)}
                              className="text-xs px-2 py-1 rounded transition hover:opacity-80 min-h-[44px] lg:min-h-[28px]"
                              style={{
                                color: chapterIsPrivate
                                  ? 'var(--accent-primary)'
                                  : 'var(--text-muted)',
                                backgroundColor:
                                  'color-mix(in srgb, var(--border-primary) 20%, transparent)',
                              }}
                              aria-label={
                                chapterIsPrivate ? 'Make chapter public' : 'Make chapter private'
                              }
                            >
                              {chapterIsPrivate ? '🔓 make public' : '🔒 make private'}
                            </button>
                          )}
                          <button
                            onClick={() => setChapterFilter(null)}
                            className="xanga-link text-xs px-2"
                          >
                            ~ show all ~
                          </button>
                        </div>
                      </motion.div>
                    );
                  })()}

                {posts.length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xanga-box p-4 mb-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2
                          className="xanga-title text-base sm:text-lg flex items-center gap-2"
                          style={{ color: 'var(--text-title)' }}
                        >
                          <Windows95MyComputer size={18} alt="" />
                          find old entries
                        </h2>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          search your archive by text, privacy, mood, music, or last edit
                        </p>
                      </div>
                      <p
                        className="text-xs font-bold"
                        aria-live="polite"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
                      >
                        showing {visiblePosts.length} of {chapterFilteredPosts.length}{' '}
                        {chapterFilteredPosts.length === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <Input
                        label="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="title, chapter, mood..."
                        icon={<Windows95Notepad size={16} alt="" />}
                        aria-label="Search entries"
                      />
                      <Select
                        label="visibility"
                        value={visibilityFilter}
                        onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
                        options={[...VISIBILITY_FILTER_OPTIONS]}
                        aria-label="Filter by visibility"
                      />
                      <Select
                        label="music"
                        value={musicFilter}
                        onChange={(e) => setMusicFilter(e.target.value as MusicFilter)}
                        options={[...MUSIC_FILTER_OPTIONS]}
                        aria-label="Filter by music"
                      />
                      <Select
                        label="mood"
                        value={moodFilter}
                        onChange={(e) => setMoodFilter(e.target.value)}
                        placeholder="any mood"
                        options={moodOptions}
                        aria-label="Filter by mood"
                      />
                      <Select
                        label="sort"
                        value={sortFilter}
                        onChange={(e) => setSortFilter(e.target.value as SortFilter)}
                        options={[...SORT_FILTER_OPTIONS]}
                        aria-label="Sort entries"
                      />
                    </div>

                    <div className="mt-3 flex flex-col gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span style={{ color: 'var(--text-muted)' }}>{activeFeedSummaryText}</span>
                        {hasFeedFilters && (
                          <button
                            onClick={clearFeedFilters}
                            className="xanga-link text-xs min-h-[44px]"
                          >
                            ~ clear search + filters ~
                          </button>
                        )}
                        {(hasFeedFilters || chapterFilter) && (
                          <button
                            onClick={clearAllFilters}
                            className="xanga-link text-xs min-h-[44px]"
                          >
                            ~ reset everything ~
                          </button>
                        )}
                      </div>

                      {activeFeedFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {activeFeedFilters.map((filter) => (
                            <button
                              key={filter.key}
                              type="button"
                              onClick={() => clearSingleFeedFilter(filter.key)}
                              className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition hover:opacity-80 min-h-[44px]"
                              style={{
                                borderColor: 'var(--border-primary)',
                                backgroundColor:
                                  'color-mix(in srgb, var(--bg-primary) 45%, var(--card-bg))',
                                color: 'var(--text-body)',
                                fontFamily: 'var(--title-font)',
                              }}
                              aria-label={`Clear filter ${filter.label}`}
                            >
                              <span>{filter.label}</span>
                              <span aria-hidden="true">×</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}

                {posts.length === 0 ? (
                  <EmptyState onCreatePost={handleNewPost} />
                ) : visiblePosts.length === 0 ? (
                  <div className="xanga-box p-6 text-center">
                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
                    >
                      {archiveEmptyStateText} ✨
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                      {chapterFilter && (
                        <button
                          onClick={() => setChapterFilter(null)}
                          className="xanga-link text-xs"
                        >
                          ~ clear chapter ~
                        </button>
                      )}
                      {hasFeedFilters && (
                        <button onClick={clearFeedFilters} className="xanga-link text-xs">
                          ~ clear search + filters ~
                        </button>
                      )}
                      <button onClick={clearAllFilters} className="xanga-link text-xs">
                        ~ show everything ~
                      </button>
                    </div>
                  </div>
                ) : (
                  <PostList
                    posts={visiblePosts}
                    onView={handleViewPost}
                    onReaction={handleReaction}
                    onBlock={handleBlock}
                    onChapterClick={handleChapterClick}
                    currentUserId={user?.id}
                    onLoadMore={loadMore}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                    loadMoreError={loadMoreError}
                  />
                )}
              </main>
            </div>
          </div>

          {/* Post Modal */}
          {showModal && (
            <Suspense fallback={<LazyFallback />}>
              <PostModal
                post={selectedPost}
                mode={modalMode}
                onSave={handleSavePost}
                onClose={() => setShowModal(false)}
                draftUserId={user?.id ?? null}
                fetchFullPost={fetchPost}
                chapters={chapters}
                onDelete={handleDeletePost}
                onEdit={handleEditPost}
                isOwner={!!user && !!selectedPost && user.id === selectedPost.user_id}
              />
            </Suspense>
          )}

          {/* Profile Modal - also shows automatically for new users who need to set up their profile */}
          {(showProfileModal || needsProfileSetup) && (
            <Suspense fallback={<LazyFallback />}>
              <ProfileModal
                profile={profile}
                userId={user?.id}
                onSave={handleSaveProfile}
                onClose={() => {
                  // Only allow closing if profile setup is complete
                  if (!needsProfileSetup) {
                    setShowProfileModal(false);
                  }
                }}
                onSuccess={success}
                onError={showError}
                isInitialSetup={needsProfileSetup}
              />
            </Suspense>
          )}

          {/* Hidden while the journal is empty: EmptyState already offers
              "write ur first entry" as its whole point, and on a phone the
              floating button lands on top of that card — two controls doing the
              same job, one obscuring the other. Desktop has the room, but the
              duplication reads as clutter there too. */}
          {user &&
            posts.length > 0 &&
            !needsProfileSetup &&
            !showModal &&
            !showProfileModal &&
            !showSettingsModal &&
            !showAuthModal && (
              <button
                type="button"
                onClick={handleNewPost}
                className="lg:hidden fixed right-4 z-30 xanga-button flex items-center gap-2 px-4 py-3 shadow-lg"
                style={{ bottom: 'calc(1rem + var(--safe-area-bottom))' }}
                aria-label="Create a new entry"
              >
                <Windows95Notepad size={18} alt="" />
                <span>new entry</span>
              </button>
            )}

          {/* Settings Modal */}
          {showSettingsModal && (
            <Suspense fallback={<LazyFallback />}>
              <SettingsModal
                onClose={() => setShowSettingsModal(false)}
                onSuccess={success}
                onError={showError}
              />
            </Suspense>
          )}

          {/* Delete Confirmation Dialog */}
          {postToDelete && (
            <ConfirmDialog
              title="~ delete entry? ~"
              message={`r u sure u want 2 delete "${postToDelete.title}"? this can't b undone!`}
              confirmLabel="~ yes, delete ~"
              loading={deleteLoading}
              onConfirm={confirmDeletePost}
              onCancel={() => setPostToDelete(null)}
            />
          )}

          {/* Block Confirmation Dialog */}
          {userToBlock && (
            <ConfirmDialog
              title="~ block user? ~"
              message="r u sure u want 2 block this user? u wont see their posts anymore. u can unblock from ur profile."
              confirmLabel="~ yes, block ~"
              loading={blockLoading}
              onConfirm={confirmBlockUser}
              onCancel={() => setUserToBlock(null)}
            />
          )}

          {/* Toast Notifications */}
          {toastLayer}
          {newPasswordLayer}

          {/* Footer - very Xanga! */}
          <footer
            className="mt-6 sm:mt-12 py-4 sm:py-6 border-t-2 border-dotted"
            style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--footer-bg)' }}
          >
            <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
              {/* 88x31 pixel badges — the most iconic web 1.0 thing */}
              <div className="badge-row">
                <span className="pixel-badge badge-love">made w/ 💕</span>
                <span className="pixel-badge badge-xanga">xanga revival</span>
                <span className="pixel-badge badge-web2">web 2.0 ✓</span>
                <span className="pixel-badge badge-powered">♻ nostalgia</span>
                <span className="pixel-badge badge-800">800x600</span>
              </div>
              <div
                className="flex items-center justify-center gap-1.5 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                <span>powered by</span>
                <Windows95MyComputer size={16} alt="" />
                <span className="xanga-subtitle">
                  <span className="blink">✨</span> YourJournal <span className="blink">✨</span>
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                © 2005-2026 My Journal • All rights reserved
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                Made with <span style={{ color: 'var(--accent-primary)' }}>💕</span> and nostalgia
              </p>
              {emojiStyle !== 'native' && getEmojiAttribution() && (
                <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                  {getEmojiAttribution()}
                </p>
              )}
            </div>
          </footer>
        </div>
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
