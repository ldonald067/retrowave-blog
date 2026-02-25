import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAuth } from './hooks/useAuth';
import { usePosts } from './hooks/usePosts';
import { useToast } from './hooks/useToast';
import { useReactions } from './hooks/useReactions';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CursorSparkle from './components/CursorSparkle';
import PostCard from './components/PostCard';
import LoadingSpinner from './components/LoadingSpinner';
import PostSkeleton, { SidebarSkeleton } from './components/PostSkeleton';
import EmptyState from './components/EmptyState';
import ErrorMessage from './components/ErrorMessage';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import type { Post, CreatePostInput } from './types/post';
import { useEmojiStyle, getEmojiAttribution } from './lib/emojiStyles';
import { moderateContent } from './lib/moderation';
import { toUserMessage } from './lib/errors';
import { supabase } from './lib/supabase';
import { hideSplashScreen } from './lib/capacitor';
import { useOnlineStatus } from './hooks/useOnlineStatus';

// Lazy-load heavy modal/overlay components — only fetched when needed
const PostModal = lazy(() => import('./components/PostModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const AgeVerification = lazy(() => import('./components/AgeVerification'));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow'));

type ModalMode = 'create' | 'edit' | 'view';

/** Minimal fallback shown while lazy chunks load */
function LazyFallback() {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

/** Virtualized post list — only renders posts visible in viewport */
const VIRTUAL_OVERSCAN = 3;
const ESTIMATED_POST_HEIGHT = 280;

function PostList({
  posts,
  onEdit,
  onDelete,
  onView,
  onReaction,
  currentUserId,
  onLoadMore,
  loadingMore,
  hasMore,
  loadMoreError,
}: {
  posts: Post[];
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onView: (post: Post) => void;
  onReaction?: (postId: string, emoji: string) => void;
  currentUserId?: string;
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreError?: string | null;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
      { root: parentRef.current, rootMargin: '0px 0px 200px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  return (
    <div>
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)', scrollbarWidth: 'thin' }}>
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
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  onReaction={onReaction}
                  currentUserId={currentUserId}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline error for pagination failures */}
      {loadMoreError && (
        <div className="xanga-box p-3 mt-4 text-center">
          <p className="text-xs" style={{ color: 'var(--accent-secondary)', fontFamily: 'var(--title-font)' }}>
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
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="xanga-button text-sm"
          >
            {loadingMore ? 'Loading...' : '\u00AB Older Entries'}
          </button>
        </div>
      )}

      {/* End-of-list indicator */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-6">
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}>
            ~ that's all for now! ~
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            ✨ u've reached the end of the feed ✨
          </p>
        </div>
      )}
    </div>
  );
}

function App() {
  const { user, profile, profileError, loading: authLoading, signOut, updateProfile, refetchProfile } = useAuth();
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
  } = usePosts();
  const { toasts, hideToast, success, error: showError } = useToast();
  // T4: Pass optimistic update handler to useReactions
  const { toggleReaction } = useReactions({
    onOptimisticUpdate: applyOptimisticReaction,
  });

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('hasCompletedOnboarding'); } catch { return false; }
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  // Show auth modal if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
      setAuthModalTab('signup'); // Default to signup for new users
    }
  }, [authLoading, user]);

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

  const handleEditPost = useCallback((post: Post) => {
    if (!user) {
      showError('~ sign in 2 edit entries! ~');
      setShowAuthModal(true);
      return;
    }
    setSelectedPost(post);
    setModalMode('edit');
    setShowModal(true);
  }, [user, showError]);

  const handleViewPost = useCallback((post: Post) => {
    setSelectedPost(post);
    setModalMode('view');
    setShowModal(true);
  }, []);

  const handleDeletePost = useCallback((post: Post) => {
    if (!user) {
      showError('~ sign in 2 delete entries! ~');
      setShowAuthModal(true);
      return;
    }
    setPostToDelete(post);
  }, [user, showError]);

  const confirmDeletePost = useCallback(async () => {
    if (!postToDelete) return;
    setDeleteLoading(true);
    const { error } = await deletePost(postToDelete.id);
    setDeleteLoading(false);
    if (error) {
      showError(`~ couldnt delete that :( ${error} ~`);
    } else {
      success('~ entry deleted 💨 ~');
    }
    setPostToDelete(null);
  }, [postToDelete, deletePost, showError, success]);

  const handleSavePost = async (postData: CreatePostInput) => {
    // C1 FIX: Run AI moderation before saving. quickContentCheck already ran
    // in PostModal (instant local feedback), but this calls the edge function
    // for full OpenAI moderation. Fail-open: if the service is down, the post
    // goes through (local regex already passed).
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const modResult = await moderateContent(
      postData.title,
      postData.content,
      null,
      supabaseUrl,
      async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
    );
    if (!modResult.allowed) {
      showError(modResult.reason || '~ content violates community guidelines ~');
      throw new Error(modResult.reason || 'Content blocked by moderation');
    }

    if (modalMode === 'edit' && selectedPost) {
      const { error } = await updatePost(selectedPost.id, postData);
      if (error) {
        showError(`~ couldnt update that :( ${error} ~`);
        return;
      }
      success('~ entry updated! looking good ✨ ~');
    } else {
      const { error } = await createPost(postData);
      if (error) {
        showError(`~ couldnt post that :( ${error} ~`);
        return;
      }
      success('✨ ur entry is live!! 💕');

      // Also update profile mood/music if provided in the post
      if (postData.mood || postData.music) {
        const profileUpdates: Record<string, string | null> = {};
        if (postData.mood) profileUpdates.current_mood = postData.mood;
        if (postData.music) profileUpdates.current_music = postData.music;
        await updateProfile(profileUpdates);
      }
    }
    setShowModal(false);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      showError(`~ couldnt sign out :( ${error} ~`);
    } else {
      success('~ goodbye 👋 come back soon! ~');
      setShowAuthModal(true);
    }
  };

  // Ref keeps current posts so handleReaction's identity stays stable
  // (no `posts` in deps → PostCard memo won't re-render on feed change).
  const postsRef = useRef(posts);
  postsRef.current = posts;

  // T4: Optimistic reactions — no more refetch() after toggle
  // Wrapped in useCallback so PostCard (React.memo) doesn't re-render on every App render
  const handleReaction = useCallback(async (postId: string, emoji: string) => {
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
  }, [user, toggleReaction, showError]);

  const handleOnboardingComplete = () => {
    try { localStorage.setItem('hasCompletedOnboarding', 'true'); } catch { /* private browsing */ }
    setShowOnboarding(false);
  };

  const handleProfileClick = () => {
    if (!user) {
      showError('~ sign in 2 edit ur profile! ~');
      setShowAuthModal(true);
      return;
    }
    setShowProfileModal(true);
  };

  // Show onboarding flow for first-time users
  if (showOnboarding) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </Suspense>
    );
  }

  // Show loading spinner during auth initialization
  if (authLoading) {
    return (
      <div className="min-h-screen themed-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Guard against age gate flash: profile fetch is async after session resolves.
  if (user && !profile && !profileError) {
    return (
      <div className="min-h-screen themed-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show auth page if not authenticated (full-screen, not modal)
  if (!user && showAuthModal) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            // Only allow closing if user is authenticated
            if (user) {
              setShowAuthModal(false);
            }
          }}
          defaultTab={authModalTab}
        />
      </Suspense>
    );
  }

  // Show age verification if user is logged in but not verified
  if (user && profile && !profile.age_verified) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AgeVerification
          onVerified={async (birthYear: number, tosAccepted: boolean) => {
            // C2 FIX: Use RPC to set COPPA fields. Direct updateProfile()
            // is now blocked by the protect_coppa_fields trigger.
            const { error } = await supabase.rpc('set_age_verification', {
              p_birth_year: birthYear,
              p_tos_accepted: tosAccepted,
            });
            if (error) {
              showError(`~ couldnt verify :( ${toUserMessage(error)} ~`);
            } else {
              // Refresh profile to pick up the new COPPA values
              await refetchProfile();
              success('✨ verified! welcome 2 the club ~');
            }
          }}
          requireTOS={true}
        />
      </Suspense>
    );
  }

  // Check if user needs to complete profile setup (new user with no display name)
  const needsProfileSetup = !!(user && profile && !profile.display_name);

  if (postsLoading) {
    return (
      <div className="min-h-screen themed-bg">
        <Header
          onNewPost={handleNewPost}
          user={user}
          profile={profile}
          onSignOut={handleSignOut}
          onAuthClick={() => setShowAuthModal(true)}
          onProfileClick={handleProfileClick}
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
      <div className="min-h-screen themed-bg">
        <Header
          onNewPost={handleNewPost}
          user={user}
          profile={profile}
          onSignOut={handleSignOut}
          onAuthClick={() => setShowAuthModal(true)}
          onProfileClick={handleProfileClick}
        />
        <ErrorMessage error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen themed-bg">
      <CursorSparkle />
      <Header
        onNewPost={handleNewPost}
        user={user}
        profile={profile}
        onSignOut={handleSignOut}
        onAuthClick={() => setShowAuthModal(true)}
        onProfileClick={handleProfileClick}
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
              backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 20%, var(--bg-primary))',
              color: 'var(--accent-secondary)',
            }}
          >
            📡 ~ ur offline rn ~ posts will load when u reconnect ✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* Xanga-style sidebar layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <Sidebar user={user} profile={profile} onEditProfile={handleProfileClick} postCount={posts.length} />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {posts.length === 0 ? (
              <EmptyState onCreatePost={handleNewPost} />
            ) : (
              <PostList
                posts={posts}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onView={handleViewPost}
                onReaction={handleReaction}
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
            fetchFullPost={fetchPost}
          />
        </Suspense>
      )}

      {/* Profile Modal - also shows automatically for new users who need to set up their profile */}
      {(showProfileModal || needsProfileSetup) && (
        <Suspense fallback={<LazyFallback />}>
          <ProfileModal
            profile={profile}
            userId={user?.id}
            onSave={updateProfile}
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

      {/* Toast Notifications */}
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

      {/* Footer - very Xanga! */}
      <footer
        className="mt-12 py-6 border-t-2 border-dotted"
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
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © 2005-2026 My Journal • All rights reserved
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            Made with <span style={{ color: 'var(--accent-primary)' }}>💕</span> and nostalgia
          </p>
          {emojiStyle !== 'native' && getEmojiAttribution() && (
            <p className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
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
