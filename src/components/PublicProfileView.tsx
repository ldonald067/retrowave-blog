import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { applyTheme, DEFAULT_THEME } from '../lib/themes';
import { Avatar } from './ui';
import { formatDate } from '../utils/formatDate';
import LoadingSpinner from './LoadingSpinner';
import ConfirmDialog from './ConfirmDialog';
import ReportDialog from './ReportDialog';
import { blockUserByUsername } from '../lib/reporting';
import type { PublicPost } from '../types/profile';

interface PublicProfileViewProps {
  username: string;
  isAuthenticated: boolean;
  onSignUp: () => void;
  onGoHome: () => void;
}

function PublicPostCard({
  post,
  onReport,
}: {
  post: PublicPost;
  onReport: (post: PublicPost) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="xanga-box overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-4 border-b-2 border-dotted"
        style={{
          background:
            'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
          borderColor: 'var(--border-primary)',
        }}
      >
        <h2 className="xanga-title text-lg sm:text-2xl mb-1 break-words">{post.title}</h2>
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs min-h-[28px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="flex items-center gap-1">
            <span style={{ color: 'var(--accent-primary)' }}>📅</span>
            {formatDate(post.created_at, 'MMM dd, yyyy')}
          </span>
          {post.chapter && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                📖 {post.chapter}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text-body)' }}
        >
          {post.content}
          {post.content_truncated && <span style={{ color: 'var(--text-muted)' }}> ...</span>}
        </div>
      </div>

      <div
        className="px-4 py-2 border-t text-right"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
          borderColor: 'var(--border-primary)',
        }}
      >
        <button
          type="button"
          onClick={() => onReport(post)}
          className="xanga-link inline-flex items-center justify-end text-xs min-h-[44px]"
          aria-label={`Report public entry: ${post.title}`}
        >
          ~ report entry ~
        </button>
      </div>
    </motion.article>
  );
}

export default function PublicProfileView({
  username,
  isAuthenticated,
  onSignUp,
  onGoHome,
}: PublicProfileViewProps) {
  const { data, loading, notFound } = usePublicProfile(username);
  const [reportingPost, setReportingPost] = useState<PublicPost | null>(null);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  async function handleBlock() {
    setBlocking(true);
    setBlockError(null);
    const { error } = await blockUserByUsername(username);
    setBlocking(false);
    setConfirmingBlock(false);
    if (error) {
      setBlockError(error);
      return;
    }
    setBlocked(true);
  }

  // Apply the profile owner's theme while viewing their page, then put back
  // whatever was there before. Restoring DEFAULT_THEME instead would wipe the
  // signed-in visitor's own theme: a user on emo-dark who opened someone's
  // public page came back to Classic Xanga.
  useEffect(() => {
    const ownerTheme = data?.profile.theme;
    if (!ownerTheme) return;

    const previousTheme = document.documentElement.getAttribute('data-theme') ?? DEFAULT_THEME;
    applyTheme(ownerTheme);

    return () => {
      applyTheme(previousTheme);
    };
  }, [data?.profile.theme]);

  useEffect(() => {
    if (!data) return;

    const pageTitle = `${data.profile.display_name || data.profile.username} | My Journal`;
    const pageDescription =
      data.profile.status_message?.trim() ||
      data.profile.bio?.trim() ||
      `${data.posts.length} public ${data.posts.length === 1 ? 'entry' : 'entries'} from @${data.profile.username}`;
    const originalTitle = document.title;
    const metaUpdates = [
      { selector: 'meta[name="title"]', content: pageTitle },
      { selector: 'meta[name="description"]', content: pageDescription },
      { selector: 'meta[property="og:title"]', content: pageTitle },
      { selector: 'meta[property="og:description"]', content: pageDescription },
      { selector: 'meta[name="twitter:title"]', content: pageTitle },
      { selector: 'meta[name="twitter:description"]', content: pageDescription },
    ].map(({ selector, content }) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      return { element, previous: element?.content ?? null, content };
    });

    document.title = pageTitle;
    metaUpdates.forEach(({ element, content }) => {
      if (element) element.content = content;
    });

    return () => {
      document.title = originalTitle;
      metaUpdates.forEach(({ element, previous }) => {
        if (element && previous !== null) {
          element.content = previous;
        }
      });
    };
  }, [data]);

  if (loading) {
    return (
      <div
        className="min-h-screen safe-area-top page-safe-bottom flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <LoadingSpinner fullScreen={false} />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div
        className="min-h-screen safe-area-top page-safe-bottom flex flex-col items-center justify-center gap-4 p-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="xanga-box p-8 text-center max-w-md">
          <p className="xanga-title text-xl mb-2">~ profile not found ~</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            This profile doesn't exist or isn't public yet.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onGoHome} className="xanga-button text-sm px-4 py-2 w-full sm:w-auto">
              go home
            </button>
            <button
              onClick={onSignUp}
              className="xanga-link text-sm w-full sm:w-auto justify-center"
            >
              start your own journal ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { profile, posts } = data;
  const publicEntryLabel = `${posts.length} public ${posts.length === 1 ? 'entry' : 'entries'}`;
  const joinedYear = new Date(profile.created_at).getFullYear();

  return (
    <div
      className="min-h-screen safe-area-top page-safe-bottom"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Marquee banner */}
      <div
        className="overflow-hidden py-1 text-xs"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
      >
        <div className="marquee">
          ~ welcome to {profile.display_name || profile.username}'s journal ~ ♥ ~ thx 4 stopping by
          ~ ☆ ~ xoxo ~
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xanga-box p-6 mb-6"
        >
          <div className="flex items-start gap-4">
            <Avatar
              src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
              alt={profile.username}
              size="lg"
              fallbackSeed={username}
            />
            <div className="flex-1 min-w-0">
              <h1 className="xanga-title text-2xl sm:text-3xl break-words">
                {profile.display_name || profile.username}
              </h1>
              <p className="xanga-subtitle">@{profile.username}</p>
              {profile.status_message && (
                <p className="aim-status mt-2">📟 ~ {profile.status_message} ~</p>
              )}
              {profile.bio && (
                <p
                  className="text-sm mt-2 italic break-words"
                  style={{ color: 'var(--text-body)' }}
                >
                  {profile.bio}
                </p>
              )}
              {profile.current_mood && (
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  ♡ feeling: {profile.current_mood}
                </p>
              )}
              {profile.current_music && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  ♫ listening to: {profile.current_music}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span
                  className="inline-flex items-center rounded-full border px-3 py-2 font-bold"
                  style={{
                    borderColor: 'var(--border-primary)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-primary) 45%, var(--card-bg))',
                    color: 'var(--text-body)',
                  }}
                >
                  {publicEntryLabel}
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-3 py-2"
                  style={{
                    borderColor: 'var(--border-primary)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-primary) 45%, var(--card-bg))',
                    color: 'var(--text-muted)',
                  }}
                >
                  writing since {joinedYear}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={onGoHome}
                  className="xanga-link inline-flex items-center justify-center text-xs min-h-[44px] px-3"
                >
                  browse home
                </button>
                <button onClick={onSignUp} className="xanga-button text-xs px-4 py-2 min-h-[44px]">
                  start your own journal
                </button>
                {/* Guideline 1.2: blocking must be reachable where you actually
                    encounter someone else's content. The PostCard block button
                    can never render here — the feed RPC returns only own posts. */}
                {blocked ? (
                  <span
                    className="inline-flex items-center text-xs min-h-[44px] px-3"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ✓ blocked — their entries are hidden from your journal
                  </span>
                ) : (
                  <button
                    onClick={() => (isAuthenticated ? setConfirmingBlock(true) : onSignUp())}
                    className="xanga-link inline-flex items-center justify-center text-xs min-h-[44px] px-3"
                    aria-label={`Block @${profile.username}`}
                  >
                    block @{profile.username}
                  </button>
                )}
              </div>
              {blockError && (
                <p className="text-xs mt-2" style={{ color: 'var(--accent-primary)' }} role="alert">
                  {blockError}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="xanga-box p-8 text-center">
              <p className="xanga-title text-lg">~ no public entries yet ~</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                This journal is just getting started ✨
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PublicPostCard key={post.id} post={post} onReport={setReportingPost} />
            ))
          )}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 mb-4 text-center"
        >
          <div className="xanga-box p-6">
            <p className="xanga-title text-lg mb-2">✨ want your own journal? ✨</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              write privately, then share only the pieces that feel ready
            </p>
            <button onClick={onSignUp} className="xanga-button text-sm px-6 py-2">
              start your journal
            </button>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            powered by ✨ YourJournal
          </p>
          {/* No "report public page" control. It used to alias to posts[0], so
              reporting a profile whose BIO was abusive filed a report against an
              unrelated, innocent entry — an operator inspecting the reported
              object would dismiss it and miss the actual violation. Every entry
              carries its own working report button, and blocking covers the
              person rather than the post. */}
        </motion.div>
      </div>

      {reportingPost && (
        <ReportDialog
          postId={reportingPost.id}
          postTitle={reportingPost.title}
          onClose={() => setReportingPost(null)}
        />
      )}

      {confirmingBlock && (
        <ConfirmDialog
          title={`~ block @${profile.username}? ~`}
          message={
            <>
              You won&apos;t see their entries anywhere in your journal, and they won&apos;t be able
              to react to yours. You can undo this later in settings.
            </>
          }
          confirmLabel="~ yes, block ~"
          loading={blocking}
          onConfirm={handleBlock}
          onCancel={() => setConfirmingBlock(false)}
        />
      )}
    </div>
  );
}
