import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Youtube, ExternalLink, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { formatDate, formatRelativeDate } from '../utils/formatDate';
import { parseYouTubeUrl, fetchYouTubeTitle, type YouTubeInfo } from '../utils/parseYouTube';
import { BLOG_OWNER_EMAIL } from '../lib/constants';
import { openUrl, sharePost } from '../lib/capacitor';
import ReactionBar from './ui/ReactionBar';
import type { Post } from '../types/post';

/** Truncate post content for feed preview — pure function, no re-creation per render. */
function truncateContent(content: string, maxLength = 300): string {
  if (!content) return '';
  return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
}

interface PostCardProps {
  post: Post;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onView: (post: Post) => void;
  onReaction?: (postId: string, emoji: string) => void;
  currentUserId?: string;
}

const PostCard = memo(function PostCard({ post, onEdit, onDelete, onView, onReaction, currentUserId }: PostCardProps) {
  const isOwner = currentUserId === post.user_id;
  const [ytInfo, setYtInfo] = useState<(YouTubeInfo & { title?: string }) | null>(null);

  // Fetch YouTube title when post.music changes
  useEffect(() => {
    if (!post.music) {
      setYtInfo(null);
      return;
    }

    const info = parseYouTubeUrl(post.music);
    if (!info) {
      setYtInfo(null);
      return;
    }

    // Set initial info without title
    setYtInfo(info);

    // Fetch title asynchronously
    fetchYouTubeTitle(info.videoId).then((title) => {
      if (title) {
        setYtInfo((prev) => (prev ? { ...prev, title } : null));
      }
    });
  }, [post.music]);

  // Xanga-style blog post card
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
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
                className="p-2.5 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded transition text-xs flex items-center justify-center"
                title="Edit post"
                aria-label="Edit post"
                style={{ color: 'var(--link-color)' }}
              >
                <span className="text-sm">✏️</span>
              </button>
              <button
                onClick={() => onDelete(post)}
                className="p-2.5 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded transition text-xs flex items-center justify-center"
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
              <a
                href={ytInfo.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  void openUrl(ytInfo.watchUrl);
                }}
                className="flex items-center gap-3 p-2 rounded transition hover:opacity-80"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 15%, var(--card-bg))',
                }}
              >
                <img
                  src={ytInfo.thumbnailUrl}
                  alt={ytInfo.title || 'YouTube thumbnail'}
                  loading="lazy"
                  className="w-20 h-14 object-cover rounded flex-shrink-0"
                  style={{ border: '1px solid var(--border-primary)' }}
                />
                <div className="flex-1 min-w-0">
                  {ytInfo.title ? (
                    <p
                      className="text-sm font-medium line-clamp-2 mb-1"
                      style={{ color: 'var(--text-body)' }}
                      title={ytInfo.title}
                    >
                      {ytInfo.title}
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Loading title...
                    </p>
                  )}
                  <div className="flex items-center gap-1">
                    <Youtube size={12} style={{ color: '#ff0000' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      YouTube
                    </span>
                    <ExternalLink size={8} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </a>
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

        {/* Read more link if truncated */}
        {post.content && post.content.length > 300 && (
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
          {/* Apple Guideline 1.2: UGC apps must provide a reporting mechanism */}
          {!isOwner && currentUserId && (
            <a
              href={`mailto:${BLOG_OWNER_EMAIL}?subject=${encodeURIComponent(`Report: "${post.title}" (${post.id})`)}`}
              className="text-[10px] transition hover:underline"
              style={{ color: 'var(--text-muted)', opacity: 0.6 }}
              aria-label="Report this post"
            >
              report
            </a>
          )}
        </div>
        <button
          onClick={() => {
            const snippet = post.content ? post.content.substring(0, 140) : '';
            void sharePost(post.title, `${post.title}\n\n${snippet}${snippet.length < (post.content?.length ?? 0) ? '...' : ''}`);
          }}
          className="p-1.5 rounded transition hover:opacity-70"
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
