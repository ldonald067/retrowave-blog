import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { applyTheme, DEFAULT_THEME } from '../lib/themes';
import { Avatar } from './ui';
import { formatDate } from '../utils/formatDate';
import LoadingSpinner from './LoadingSpinner';
import type { PublicPost } from '../types/profile';

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '😢', '✨', '👀'];

interface PublicProfileViewProps {
  username: string;
  onSignUp: () => void;
  onGoHome: () => void;
}

function ReactionDisplay({ reactions }: { reactions: Record<string, number> }) {
  const entries = Object.entries(reactions).filter(([, count]) => count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {entries.map(([emoji, count]) => (
        <span
          key={emoji}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
          style={{
            borderColor: 'var(--border-primary)',
            color: 'var(--text-muted)',
            backgroundColor: 'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))',
          }}
        >
          {emoji} {count}
        </span>
      ))}
    </div>
  );
}

function PublicPostCard({ post, onReactClick }: { post: PublicPost; onReactClick: () => void }) {
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
          background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
          borderColor: 'var(--border-primary)',
        }}
      >
        <h2 className="xanga-title text-lg sm:text-2xl mb-1">{post.title}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs min-h-[28px]" style={{ color: 'var(--text-muted)' }}>
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
          {post.content_truncated && (
            <span style={{ color: 'var(--text-muted)' }}> ...</span>
          )}
        </div>

        {/* Reactions display */}
        <ReactionDisplay reactions={post.reactions} />

        {/* React prompt */}
        <div className="mt-3 pt-3 border-t border-dotted" style={{ borderColor: 'var(--border-primary)' }}>
          <button
            onClick={onReactClick}
            className="flex items-center gap-2 text-xs transition hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            {REACTION_EMOJIS.slice(0, 3).join(' ')} <span className="underline">sign up to react</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function PublicProfileView({ username, onSignUp, onGoHome }: PublicProfileViewProps) {
  const { data, loading, notFound } = usePublicProfile(username);

  // Apply the profile owner's theme
  useEffect(() => {
    if (data?.profile.theme) {
      applyTheme(data.profile.theme);
    }
    return () => {
      // Restore default theme when leaving
      applyTheme(DEFAULT_THEME);
    };
  }, [data?.profile.theme]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="xanga-box p-8 text-center max-w-md">
          <p className="xanga-title text-xl mb-2">~ profile not found ~</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            This profile doesn't exist or isn't public yet.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={onGoHome} className="xanga-button text-sm px-4 py-2">
              go home
            </button>
            <button onClick={onSignUp} className="xanga-link text-sm">
              start your own journal ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { profile, posts } = data;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Marquee banner */}
      <div
        className="overflow-hidden py-1 text-xs"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
      >
        <div className="marquee">
          ~ welcome to {profile.display_name || profile.username}'s journal ~ ♥ ~ thx 4 stopping by ~ ☆ ~ xoxo ~
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
              <h1 className="xanga-title text-2xl sm:text-3xl">
                {profile.display_name || profile.username}
              </h1>
              <p className="xanga-subtitle">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm mt-2 italic" style={{ color: 'var(--text-body)' }}>
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
              <PublicPostCard key={post.id} post={post} onReactClick={onSignUp} />
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
              pick a theme, write your thoughts, share with friends
            </p>
            <button onClick={onSignUp} className="xanga-button text-sm px-6 py-2">
              start your journal
            </button>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            powered by ✨ YourJournal
          </p>
        </motion.div>
      </div>
    </div>
  );
}
