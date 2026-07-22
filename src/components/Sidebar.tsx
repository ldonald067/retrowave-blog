import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';
import {
  Avatar,
  YouTubeCard,
  Pepicon,
  Windows95Notepad,
  Windows98DateTime,
  Winamp as WinampIcon,
} from './ui';
import { useYouTubeInfo } from '../hooks/useYouTubeInfo';
import { useTrailMode, TRAIL_MODE_OPTIONS } from '../lib/cursorTrail';
import { buildPublicProfileUrl } from '../lib/publicProfile';
import type { Chapter } from '../hooks/useChapters';

interface SidebarProps {
  user: SupabaseUser | null;
  profile: Profile | null;
  onEditProfile?: () => void;
  postCount?: number;
  chapters?: Chapter[];
  activeChapter?: string | null;
  onChapterSelect?: (chapter: string | null) => void;
  looseCount?: number;
  looseKey?: string;
  privateChapters?: string[];
  onToggleChapterPrivacy?: (chapter: string) => void;
}

export default function Sidebar({
  user,
  profile,
  onEditProfile,
  postCount = 0,
  chapters = [],
  activeChapter = null,
  onChapterSelect,
  looseCount = 0,
  looseKey = '__loose__',
  privateChapters = [],
  onToggleChapterPrivacy,
}: SidebarProps) {
  const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      // Default to collapsed (true) so mobile users see the feed first.
      // Desktop sidebar is always visible via `hidden lg:block`, unaffected.
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [shareCopied, setShareCopied] = useState(false);
  const shareSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleToggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* private browsing */
      }
      return next;
    });
  };

  const userData = {
    username: profile?.username || user?.email?.split('@')[0] || 'guest',
    displayName: profile?.display_name || '✨ New User ✨',
    avatar:
      profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'guest'}`,
    bio: profile?.bio || 'Welcome to my journal!',
    mood: profile?.current_mood || null,
    music: profile?.current_music || null,
    memberSince: profile?.created_at
      ? new Date(profile.created_at).getFullYear().toString()
      : '2026',
  };

  const ytInfo = useYouTubeInfo(userData.music);
  const [trailMode, setTrail] = useTrailMode();
  const publicProfileUrl =
    profile?.is_public && profile?.username ? buildPublicProfileUrl(profile.username) : null;
  const statusMessage = profile?.status_message?.trim() ?? '';

  const flashShareState = () => {
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleSharePublicPage = async () => {
    if (!publicProfileUrl) return;
    try {
      if (shareSupported) {
        await navigator.share({
          title: `${userData.displayName}'s journal`,
          text: `come read ${userData.displayName}'s journal`,
          url: publicProfileUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicProfileUrl);
      }
      flashShareState();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(publicProfileUrl);
        flashShareState();
      } catch {
        // Ignore share/copy failures in restricted browsers.
      }
    }
  };

  // Full sidebar content — shared between mobile expanded and desktop
  const sidebarContent = (
    <>
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="xanga-box p-4"
      >
        <div className="text-center">
          <div className="relative inline-block mb-3">
            <Avatar
              src={userData.avatar}
              alt={userData.username}
              size="lg"
              fallbackSeed={user?.id || 'guest'}
              onClick={onEditProfile}
              editable={!!onEditProfile}
            />
            {user && onEditProfile && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onEditProfile}
                className="absolute -bottom-1 -right-1 min-h-[44px] min-w-[44px] flex items-center justify-center border-2 rounded-full shadow-md transition"
                title="Edit Profile"
                aria-label="Edit Profile"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <Pepicon name="gear" size={12} color="var(--accent-primary)" />
              </motion.button>
            )}
          </div>
          <h2 className="xanga-title text-xl mb-1 break-words">{userData.displayName}</h2>
          <p className="xanga-subtitle break-words">@{userData.username}</p>
          {publicProfileUrl && (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => void handleSharePublicPage()}
                className="xanga-link text-xs inline-flex items-center gap-1 min-h-[44px]"
                title={shareSupported ? 'Share public page link' : 'Copy public page link'}
                aria-label={shareSupported ? 'Share public page link' : 'Copy public page link'}
              >
                {shareCopied
                  ? shareSupported
                    ? 'shared'
                    : 'copied'
                  : shareSupported
                    ? 'share public page'
                    : 'copy public page'}
              </button>
              <a
                href={publicProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="xanga-link text-xs inline-flex items-center gap-1 min-h-[44px]"
              >
                open public page
              </a>
            </div>
          )}
          {statusMessage && <p className="aim-status mt-1">📟 ~ {statusMessage} ~</p>}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {/* Current Mood - from profile */}
          {userData.mood && (
            <div
              className="p-2 rounded-lg border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg))',
                borderColor: 'var(--border-primary)',
              }}
            >
              <div className="flex items-center gap-2">
                <Pepicon name="heartFilled" size={14} color="var(--accent-primary)" />
                <span className="font-bold" style={{ color: 'var(--text-body)' }}>
                  Current Mood:
                </span>
              </div>
              <div className="ml-6 mt-1" style={{ color: 'var(--text-muted)' }}>
                {userData.mood}
              </div>
            </div>
          )}

          {/* Currently Listening - Winamp-style mini player */}
          {userData.music && (
            <div className="winamp-player">
              <div className="winamp-titlebar">
                <span className="flex items-center gap-1">
                  <WinampIcon size={12} alt="" /> WINAMP
                </span>
                <span style={{ fontSize: '7px', opacity: 0.7 }}>v2.91</span>
              </div>
              <div className="winamp-display">{ytInfo?.title || userData.music}</div>
              <div className="winamp-progress">
                <div className="winamp-progress-bar" />
              </div>
              <div className="winamp-controls" aria-hidden="true">
                <button className="winamp-btn" tabIndex={-1}>
                  ⏮
                </button>
                <button className="winamp-btn" tabIndex={-1}>
                  ▶
                </button>
                <button className="winamp-btn" tabIndex={-1}>
                  ⏸
                </button>
                <button className="winamp-btn" tabIndex={-1}>
                  ⏹
                </button>
                <button className="winamp-btn" tabIndex={-1}>
                  ⏭
                </button>
              </div>
              {ytInfo && (
                <div className="px-1 pb-1">
                  <YouTubeCard ytInfo={ytInfo} size="sm" />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* About Me */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="xanga-box p-4"
      >
        <h3
          className="xanga-title text-lg mb-2 border-b-2 border-dotted pb-1"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          About Me
        </h3>
        <p
          className="text-xs leading-relaxed italic break-words"
          style={{ color: 'var(--text-body)' }}
        >
          {userData.bio}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="xanga-box p-4"
      >
        <h3
          className="xanga-title text-lg mb-3 border-b-2 border-dotted pb-1"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          Stats
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Windows95Notepad size={14} alt="" />
              Entries:
            </span>
            <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
              {postCount}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Windows98DateTime size={14} alt="" />
              member since:
            </span>
            <span className="font-bold" style={{ color: 'var(--accent-secondary)' }}>
              {userData.memberSince} ✨
            </span>
          </div>
        </div>
      </motion.div>

      {/* Chapters — desktop only; mobile uses ChapterChips above the feed */}
      {chapters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="xanga-box p-4 hidden lg:block"
        >
          <h3
            className="xanga-title text-lg mb-2 border-b-2 border-dotted pb-1"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            📖 Chapters
          </h3>
          <div className="space-y-0.5">
            {/* "All entries" option */}
            <button
              onClick={() => onChapterSelect?.(null)}
              className="w-full text-left px-2 py-1.5 rounded text-[13px] transition min-h-[44px] lg:min-h-[36px] flex items-center justify-between gap-2"
              style={{
                color: activeChapter === null ? 'var(--accent-primary)' : 'var(--text-body)',
                fontWeight: activeChapter === null ? 700 : 400,
                fontFamily: 'var(--title-font)',
                backgroundColor:
                  activeChapter === null
                    ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
                    : 'transparent',
              }}
              aria-label={`Show all entries (${postCount})`}
              aria-pressed={activeChapter === null}
            >
              <span>✨ all entries</span>
              <span
                className="text-xs font-normal"
                style={{ color: 'var(--text-muted)', fontFamily: 'sans-serif' }}
              >
                {postCount}
              </span>
            </button>
            {looseCount > 0 && (
              <button
                onClick={() => onChapterSelect?.(activeChapter === looseKey ? null : looseKey)}
                className="w-full text-left px-2 py-1.5 rounded text-[13px] transition min-h-[44px] lg:min-h-[36px] flex items-center justify-between gap-2"
                style={{
                  color: activeChapter === looseKey ? 'var(--accent-primary)' : 'var(--text-body)',
                  fontWeight: activeChapter === looseKey ? 700 : 400,
                  fontFamily: 'var(--title-font)',
                  backgroundColor:
                    activeChapter === looseKey
                      ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
                      : 'transparent',
                }}
                aria-label={`Show loose entries (${looseCount})`}
                aria-pressed={activeChapter === looseKey}
              >
                <span>🍃 loose entries</span>
                <span
                  className="text-xs font-normal"
                  style={{ color: 'var(--text-muted)', fontFamily: 'sans-serif' }}
                >
                  {looseCount}
                </span>
              </button>
            )}
            {chapters.map((ch) => {
              const isPrivate = privateChapters.includes(ch.chapter);
              return (
                <div key={ch.chapter} className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      onChapterSelect?.(activeChapter === ch.chapter ? null : ch.chapter)
                    }
                    className="flex-1 text-left px-2 py-1.5 rounded text-[13px] transition min-h-[44px] lg:min-h-[36px] flex items-center justify-between gap-2 min-w-0"
                    style={{
                      color:
                        activeChapter === ch.chapter ? 'var(--accent-primary)' : 'var(--text-body)',
                      fontWeight: activeChapter === ch.chapter ? 700 : 400,
                      fontFamily: 'var(--title-font)',
                      backgroundColor:
                        activeChapter === ch.chapter
                          ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
                          : 'transparent',
                    }}
                    aria-pressed={activeChapter === ch.chapter}
                    aria-label={`Filter by chapter: ${ch.chapter} (${ch.post_count} ${ch.post_count === 1 ? 'entry' : 'entries'})`}
                  >
                    <span className="truncate">
                      {isPrivate ? '🔒' : '📖'} {ch.chapter}
                    </span>
                    <span
                      className="text-xs font-normal flex-shrink-0"
                      style={{ color: 'var(--text-muted)', fontFamily: 'sans-serif' }}
                    >
                      {ch.post_count}
                    </span>
                  </button>
                  {onToggleChapterPrivacy && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleChapterPrivacy(ch.chapter);
                      }}
                      className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded transition hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label={
                        isPrivate ? `Make "${ch.chapter}" public` : `Make "${ch.chapter}" private`
                      }
                      title={isPrivate ? 'Make public' : 'Make private'}
                    >
                      <span className="text-sm">{isPrivate ? '🔓' : '🔒'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Cursor Trail Picker — desktop only */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="xanga-box p-4 hidden lg:block"
      >
        <h3
          className="xanga-title text-lg mb-2 border-b-2 border-dotted pb-1"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          cursor trail ✦
        </h3>
        <div className="flex flex-wrap gap-1">
          {TRAIL_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTrail(opt.id)}
              className="xanga-button text-xs px-2 py-1"
              style={{
                opacity: trailMode === opt.id ? 1 : 0.6,
                transform: trailMode === opt.id ? 'scale(1.05)' : 'scale(1)',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              aria-label={`Set cursor trail to ${opt.label}`}
              aria-pressed={trailMode === opt.id}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );

  return (
    <aside className="w-full lg:w-64 space-y-4" role="complementary" aria-label="Blog sidebar">
      {/* Mobile: compact summary bar + collapsible */}
      <div className="lg:hidden">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleToggleCollapsed}
          className="xanga-box w-full p-3 flex items-center gap-3 min-h-[44px]"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Avatar
            src={userData.avatar}
            alt={userData.username}
            size="sm"
            fallbackSeed={user?.id || 'guest'}
          />
          <div className="flex-1 text-left min-w-0">
            <p
              className="text-sm font-bold truncate"
              style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
            >
              {userData.displayName}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {userData.mood || `@${userData.username}`}
            </p>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </motion.button>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-4 mt-4"
            >
              {sidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: always visible */}
      <div className="hidden lg:block space-y-4">{sidebarContent}</div>
    </aside>
  );
}
