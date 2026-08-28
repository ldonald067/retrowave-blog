import { memo } from 'react';
import { motion } from 'framer-motion';
import { Winamp as WinampIcon } from './ui';
import MarkdownContent from './ui/MarkdownContent';
import { formatDate } from '../utils/formatDate';
import { useYouTubeInfo } from '../hooks/useYouTubeInfo';
import { FEED_EXCERPT_MAX } from '../lib/constants';
import ReactionBar from './ui/ReactionBar';
import YouTubeCard from './ui/YouTubeCard';
import type { Post } from '../types/post';

/** Truncate post content for feed preview — pure function, no re-creation per render. */
function truncateContent(content: string, maxLength = FEED_EXCERPT_MAX): string {
  if (!content) return '';
  return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
}

interface PostCardProps {
  post: Post;
  onView: (post: Post) => void;
  onReaction?: (postId: string, emoji: string) => void;
  onChapterClick?: (chapter: string) => void;
  currentUserId?: string;
}

const PostCard = memo(function PostCard({
  post,
  onView,
  onReaction,
  onChapterClick,
  currentUserId,
}: PostCardProps) {
  const ytInfo = useYouTubeInfo(post.music);

  // Xanga-style blog post card
  return (
    <motion.article
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        mass: 0.8,
      }}
      className="xanga-box p-0 overflow-hidden"
    >
      {/* Post header with title and date - colorful banner */}
      <div
        className="p-4 border-b-2 border-dotted"
        style={{
          background:
            'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div>
          <h2 className="xanga-title text-lg sm:text-2xl mb-1">
            {/* `line-clamp-2` and `flex` cannot share an element: the clamp
                needs `display: -webkit-box` and `flex` overrides it, so the
                clamp silently did nothing. A 200-character title — a length the
                field accepts — rendered five lines and pushed past the card's
                right padding. The clamp lives on an inner span so the button
                keeps `flex` for its 44pt target, and `w-full`/`min-w-0` stop a
                flex item from outgrowing its container. */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onView(post)}
              className="text-left cursor-pointer transition hover:opacity-80 py-1 min-h-[44px] lg:min-h-0 flex items-center w-full min-w-0"
              style={{ color: 'inherit', textShadow: 'inherit' }}
              aria-label={`View post: ${post.title}`}
            >
              <span className="line-clamp-2 break-words w-full min-w-0">{post.title}</span>
            </motion.button>
          </h2>
          {/* Same three rules as the entry detail: context is muted and regular,
              a control looks like a control, and the row gap survives a wrap.
              Two things were wrong here specifically.

              The 📅 carried `color: var(--accent-primary)`, which does nothing —
              emoji render in their own colours and ignore `color`. It read as
              intent that was never happening.

              The chapter is genuinely tappable (it filters the feed), but it was
              --accent-primary on the header gradient, which measures 2.38:1 on
              classic-xanga, 3.13 on myspace-blue and 3.20 on cottage-core. Its
              only affordance was `hover:underline`, and hover does not exist on
              the platform this ships on — so on a phone it was a low-contrast
              control with nothing marking it as one. It is --text-body now
              (6.10:1 at worst on that gradient) and permanently underlined. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs min-h-[44px] lg:min-h-0">
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <span aria-hidden="true">📅</span>
              {formatDate(post.created_at, 'MMM dd, yyyy')}
            </span>
            {post.chapter && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChapterClick?.(post.chapter!);
                }}
                className="flex items-center gap-1.5 underline underline-offset-2 min-h-[44px] lg:min-h-0 max-w-[160px] sm:max-w-[220px] min-w-0"
                style={{ color: 'var(--text-body)' }}
                aria-label={`Filter by chapter: ${post.chapter}`}
              >
                <span aria-hidden="true" className="flex-shrink-0">
                  📖
                </span>
                <span className="truncate italic">{post.chapter}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Post content */}
      <div className="p-4">
        {/* Mood indicator if available */}
        {post.mood && (
          <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Current Mood:{' '}
            </span>
            <span className="text-sm">{post.mood}</span>
          </div>
        )}

        {/* Music if available - with YouTube preview */}
        {post.music && (
          <div
            className="mb-3 pb-3 border-b p-2 rounded"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-secondary) 30%, var(--card-bg))',
              backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 10%, var(--card-bg))',
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              <WinampIcon size={14} alt="" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Currently listening to:
              </span>
            </div>
            {ytInfo ? (
              <YouTubeCard ytInfo={ytInfo} />
            ) : (
              <span className="text-xs italic" style={{ color: 'var(--accent-secondary)' }}>
                {post.music}
              </span>
            )}
          </div>
        )}

        {/* Post content - Markdown rendered with XSS protection */}
        <MarkdownContent className="prose prose-sm max-w-none mb-4">
          {truncateContent(post.content)}
        </MarkdownContent>

        {/* Read more link — prefer server truncation flag over length guess */}
        {(post.content_truncated || (post.content && post.content.length > FEED_EXCERPT_MAX)) && (
          <button onClick={() => onView(post)} className="xanga-link text-xs">
            ~ read more ~
          </button>
        )}
      </div>

      {/* Post footer - author + actions row */}
      <div
        className="px-4 pt-2 pb-1 border-t flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-muted)',
        }}
      >
        {/* A byline is context, so it is muted and regular. It was semibold in
            --accent-primary, which made the least consequential fact on the card
            the loudest thing in its footer — the same inversion the entry detail
            had, where "~ Anonymous" outranked the entry itself. */}
        {post.author && (
          <span className="min-w-0 max-w-full truncate" style={{ color: 'var(--text-muted)' }}>
            ~ {post.author}
          </span>
        )}
      </div>

      {/* Post footer - reactions row */}
      <div
        className="px-4 pb-2 pt-1"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
        }}
      >
        <ReactionBar
          reactions={post.reactions ?? {}}
          userReactions={post.user_reactions ?? []}
          onToggle={(emoji) => onReaction?.(post.id, emoji)}
          disabled={!currentUserId}
        />
      </div>

      {/* Decorative bottom border */}
      <div
        className="h-1"
        style={{
          background:
            'linear-gradient(to right, var(--accent-primary), var(--accent-secondary), var(--border-primary))',
        }}
      />
    </motion.article>
  );
});

export default PostCard;
