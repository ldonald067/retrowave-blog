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
import PostSkeleton from './components/PostSkeleton';
import EmptyState from './components/EmptyState';
import ErrorMessage from './components/ErrorMessage';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import type { Post, CreatePostInput } from './types/post';

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
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  return (
    <div>
      <div ref={parentRef} className="max-h-[80vh] overflow-auto scrollbar-thin">
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
                  viewMode="list"
                  currentUserId={currentUserId}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Infinite scroll sentinel + fallback manual button */}
      {hasMore && (
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
    </div>
  );
}

function App() {
  const { user, profile, loading: authLoading, signOut, updateProfile } = useAuth();
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
    refetch,
    applyOptimisticReaction,
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
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem('hasCompletedOnboarding')
  );
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  // Show auth modal if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
      setAuthModalTab('signup'); // Default to signup for new users
    }
  }, [authLoading, user]);

  const handleNewPost = () => {
    if (!user) {
      showError('Please sign in to create posts');
      setShowAuthModal(true);
      return;
    }
    setSelectedPost(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditPost = (post: Post) => {
    if (!user) {
      showError('Please sign in to edit posts');
      setShowAuthModal(true);
      return;
    }
    setSelectedPost(post);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewPost = (post: Post) => {
    setSelectedPost(post);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDeletePost = (post: Post) => {
    if (!user) {
      showError('Please sign in to delete posts');
      setShowAuthModal(true);
      return;
    }
    setPostToDelete(post);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    const { error } = await deletePost(postToDelete.id);
    if (error) {
      showError(`Error deleting post: ${error}`);
    } else {
      success('Post deleted successfully!');
    }
    setPostToDelete(null);
  };

  const handleSavePost = async (postData: CreatePostInput) => {
    if (modalMode === 'edit' && selectedPost) {
      const { error } = await updatePost(selectedPost.id, postData);
      if (error) {
        showError(`Error updating post: ${error}`);
        return;
      }
      success('Post updated successfully!');
    } else {
      const { error } = await createPost(postData);
      if (error) {
        showError(`Error creating post: ${error}`);
        return;
      }
      success('Post created successfully!');

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
      showError(`Error signing out: ${error}`);
    } else {
      success('Signed out successfully!');
      setShowAuthModal(true);
    }
  };

  // T4: Optimistic reactions — no more refetch() after toggle
  const handleReaction = async (postId: string, emoji: string) => {
    if (!user) {
      showError('Please sign in to react');
      setShowAuthModal(true);
      return;
    }
    const post = posts.find((p) => p.id === postId);
    const currentUserReactions = post?.user_reactions ?? [];

    const { error } = await toggleReaction(postId, emoji, currentUserReactions);
    if (error) {
      showError(error);
      // Note: useReactions already rolled back the optimistic update on error
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    setShowOnboarding(false);
  };

  const handleProfileClick = () => {
    if (!user) {
      showError('Please sign in to edit your profile');
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
            // Update the profile with age verification
            const { error } = await updateProfile({
              age_verified: true,
              tos_accepted: tosAccepted,
              birth_year: birthYear,
            });
            if (error) {
              showError(`Failed to verify age: ${error}`);
            } else {
              success('Age verified successfully!');
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
          <PostSkeleton />
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
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>© 2005-2026 My Journal • All rights reserved</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            Made with <span style={{ color: 'var(--accent-primary)' }}>💕</span> and nostalgia
          </p>
        </div>
      </footer>
    </div>
    </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
