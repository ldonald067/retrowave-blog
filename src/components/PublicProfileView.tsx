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
        <h2 className="xanga-title text-xl sm:text-2xl mb-2 break-words">{post.title}</h2>
        {/* The same four-fact band as the entry detail, so it gets the same
            treatment. The chapter was --accent-primary on this header gradient,
            which measures 2.38:1 on classic-xanga, 3.13 on myspace-blue, 3.20
            on cottage-core and 4.31 on grunge — the identical failure the feed
            card carried until `74c20b7`. It is not a control here, because a
            visitor has nothing to filter, so it takes the `name` treatment
            rather than the feed card's: italic --text-subtitle, which is 4.51
            at worst on the same gradient.

            `min-w-0` + `truncate` because a chapter runs to 100 characters with
            no spaces, and `gap-y-2` so the rows stay legible once it wraps. The
            `•` is gone — it was `hidden sm:inline`, so it did nothing on a
            phone and could orphan onto its own line on a wider screen.
            Whitespace separates instead; it cannot orphan. */}
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs min-h-[28px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true">📅</span>
            {formatDate(post.created_at, 'MMM dd, yyyy')}
          </span>
          {post.chapter && (
            <span className="flex items-center gap-1.5 min-w-0 max-w-[14rem]">
              <span aria-hidden="true">📖</span>
              <span className="truncate italic" style={{ color: 'var(--text-subtitle)' }}>
                {post.chapter}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* `.prose-reading` (1rem/1.7), not `text-sm`. A public page shows
            entries in full — it is somewhere you read, not a list you scan — so
            it takes the reading tier the entry detail uses. At text-sm the card
            ran an 18px title over 14px body over 12px chrome, a scale whose
            middle was four pixels wide. */}
        <div className="prose-reading whitespace-pre-wrap" style={{ color: 'var(--text-body)' }}>
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
          className="xanga-link-caution inline-flex items-center justify-end text-xs min-h-[44px]"
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
      {/* `.marquee-banner` + `.marquee-banner-inner`, which is what Header uses
          and what index.css actually defines. This was `.marquee`, a class that
          exists nowhere in the stylesheet — so the banner never scrolled, never
          clipped and simply wrapped onto two static lines on the most
          visitor-facing screen in the app. aria-hidden to match Header: it is
          decoration, and the display name it repeats is the h1 below it. */}
      <div className="marquee-banner" aria-hidden="true">
        <div
          className="marquee-banner-inner"
          style={{ color: 'var(--text-subtitle)', fontSize: '12px' }}
        >
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
          {/* Identity beside the avatar; everything else full width beneath it.
              The avatar is w-24 — 96pt — and the old single column next to it
              ran past 400pt, so a third of this card was an empty strip under
              the avatar that nothing ever filled. `.stack-when-scaled` had
              already diagnosed exactly that ("a tall empty gap under the
              avatar") and fixed it only for Dynamic Type; at default size the
              gap was simply less obvious.

              Only the name and handle stay in the row, because they are the two
              things short enough to sit beside a 96pt square without being
              squeezed. `items-center` because the text is now shorter than the
              avatar rather than taller than it. */}
          <div className="flex items-center gap-4 stack-when-scaled">
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
            </div>
          </div>

          {/* mt-6 sets the identity apart from the content; space-y-4 keeps the
              content blocks a group rather than a stack of loose paragraphs. */}
          <div className="mt-6 space-y-4">
            {profile.status_message && (
              <p className="aim-status">📟 ~ {profile.status_message} ~</p>
            )}
              {profile.bio && (
                <p
                  className="text-sm italic break-words"
                  style={{ color: 'var(--text-body)' }}
                >
                  {profile.bio}
                </p>
              )}
              {/* Mood and music get a panel, not two grey lines.
                  These are the two most Xanga things on the page — the whole
                  point of visiting someone's journal is to see what they are
                  feeling and what they have on repeat — and they were rendered
                  as the quietest text in the card, indistinguishable from the
                  bio and the entry count above and below them.
                  The signed-in sidebar already gives mood an accent-tinted box
                  with a bold label, and music a full Winamp player, so the
                  public view was also contradicting the app's own language.
                  One shared panel rather than two: it lifts both without
                  spending two boxes' worth of a 390pt screen, and it keeps them
                  reading as a pair, which is what they are. Labels stay quiet so
                  the emphasis lands on "nostalgic", not on "feeling". */}
              {(profile.current_mood || profile.current_music) && (
                <div
                  className="rounded-lg border px-3 py-2.5 space-y-1.5"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg))',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  {profile.current_mood && (
                    <p className="text-sm flex flex-wrap items-baseline gap-x-1.5">
                      <span aria-hidden="true" style={{ color: 'var(--accent-primary)' }}>
                        ♡
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        feeling
                      </span>
                      <span className="font-bold" style={{ color: 'var(--text-body)' }}>
                        {profile.current_mood}
                      </span>
                    </p>
                  )}
                  {profile.current_music && (
                    <p className="text-sm flex flex-wrap items-baseline gap-x-1.5">
                      <span aria-hidden="true" style={{ color: 'var(--accent-primary)' }}>
                        ♫
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        on repeat
                      </span>
                      <span className="font-bold break-words" style={{ color: 'var(--text-body)' }}>
                        {profile.current_music}
                      </span>
                    </p>
                  )}
                </div>
              )}
              {/* Plain text, not pills. These were bordered, filled, rounded
                  spans — chip styling, which on this screen sits inches from
                  real chips and reads as a tappable filter. Nothing happens
                  when you tap them, and on a phone they took a whole row of the
                  most valuable space on the page to say something you can
                  confirm by scrolling. The year stays because it is one word
                  here rather than a row of its own; note it says the same thing
                  for every profile until the app has been live a second year,
                  so it is worth deleting outright if it still reads as filler
                  then. */}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {publicEntryLabel} · writing since {joinedYear}
            </p>
          </div>

          {/* Its own group, mt-6 from the content above: these are controls, not
              more of the profile. gap-x-4/gap-y-3, not gap-2 — the three wrap
              onto three rows on a phone, and at 8px a caution link sits hard
              under a filled primary button and reads as part of it. */}
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-3">
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
                    className="xanga-link-caution inline-flex items-center justify-center text-xs min-h-[44px] px-3"
                    aria-label={`Block @${profile.username}`}
                  >
                    block @{profile.username}
                  </button>
                )}
              </div>
          {blockError && (
            <p className="text-xs mt-3" style={{ color: 'var(--accent-primary)' }} role="alert">
              {blockError}
            </p>
          )}
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
