import { memo } from 'react';
import { motion } from 'framer-motion';
import { Share2, Ban, Flag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { formatDate, formatRelativeDate } from '../utils/formatDate';
import { useYouTubeInfo } from '../hooks/useYouTubeInfo';
import { BLOG_OWNER_EMAIL, FEED_EXCERPT_MAX, SHARE_SNIPPET_MAX } from '../lib/constants';
import { sharePost } from '../lib/capacitor';
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
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onView: (post: Post) => void;
  onReaction?: (postId: string, emoji: string) => void;
  onBlock?: (userId: string) => void;
  currentUserId?: string;
}

const PostCard = memo(function PostCard({ post, onEdit, onDelete, onView, onReaction, onBlock, currentUserId }: PostCardProps) {
  const isOwner = currentUserId === post.user_id;
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
          background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="xanga-title text-2xl mb-1">
              <button
                onClick={() => onView(post)}
                className="text-left cursor-pointer transition hover:opacity-80"
                style={{ color: 'inherit', textShadow: 'inherit' }}
                aria-label={`View post: ${post.title}`}
              >
                {post.title}
              </button>
            </h2>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1">
                <span style={{ color: 'var(--accent-primary)' }}>📅</span>
                {formatDate(post.created_at, 'MMM dd, yyyy')} @{' '}
                {formatDate(post.created_at, 'h:mm a')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span style={{ color: 'var(--accent-secondary)' }}>⏰</span>
                {formatRelativeDate(post.created_at)}
              </span>
            </div>
          </div>

          {/* Edit/Delete buttons - only show for post owner */}
          {isOwner && (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(post)}
                className="icon-btn-hover p-2.5 lg:p-1.5 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 rounded-lg transition-all text-xs flex items-center justify-center hover:scale-110"
                title="Edit post"
                aria-label="Edit post"
                style={{ color: 'var(--link-color)' }}
              >
                <span className="text-sm">✏️</span>
              </button>
              <button
                onClick={() => onDelete(post)}
                className="icon-btn-hover p-2.5 lg:p-1.5 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 rounded-lg transition-all text-xs flex items-center justify-center hover:scale-110"
                title="Delete post"
                aria-label="Delete post"
                style={{ color: 'var(--accent-secondary)' }}
              >
                <span className="text-sm">🗑️</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post content */}
      <div className="p-4">
        {/* Mood indicator if available */}
        {post.mood && (
          <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Current Mood: </span>
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
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🎵 Currently listening to:</span>
            </div>
            {ytInfo ? (
              <YouTubeCard ytInfo={ytInfo} />
            ) : (
              <span className="text-xs italic" style={{ color: 'var(--accent-secondary)' }}>{post.music}</span>
            )}
          </div>
        )}

        {/* Post content - Markdown rendered with XSS protection */}
        <div className="prose prose-sm max-w-none mb-4">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
            {truncateContent(post.content)}
          </ReactMarkdown>
        </div>

        {/* Read more link — prefer server truncation flag over length guess */}
        {(post.content_truncated || (post.content && post.content.length > FEED_EXCERPT_MAX)) && (
          <button
            onClick={() => onView(post)}
            className="xanga-link text-xs"
          >
            ~ read more ~
          </button>
        )}
      </div>

      {/* Post footer - author row */}
      <div
        className="px-4 pt-2 pb-1 border-t flex items-center justify-between text-xs"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="flex items-center gap-3">
          {post.author && <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>~ {post.author}</span>}
          {/* Apple Guideline 1.2: UGC apps must provide reporting + blocking */}
          {!isOwner && currentUserId && (
            <>
              <a
                href={`mailto:${BLOG_OWNER_EMAIL}?subject=${encodeURIComponent(`Report: "${post.title}" (${post.id})`)}`}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition hover:opacity-80 min-h-[44px]"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Report this post"
              >
                <Flag size={12} />
                report
              </a>
              <button
                onClick={() => onBlock?.(post.user_id)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition hover:opacity-80 min-h-[44px] min-w-[44px] justify-center"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Block this user"
              >
                <Ban size={12} />
                block
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => {
            const snippet = post.content ? post.content.substring(0, SHARE_SNIPPET_MAX) : '';
            void sharePost(post.title, `${snippet}${snippet.length < (post.content?.length ?? 0) ? '...' : ''}`);
          }}
          className="p-1.5 rounded transition hover:opacity-70 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Share post"
          aria-label="Share post"
          style={{ color: 'var(--text-muted)' }}
        >
          <Share2 size={14} />
        </button>
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
          background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary), var(--border-primary))',
        }}
      />
    </motion.article>
  );
});

export default PostCard;
