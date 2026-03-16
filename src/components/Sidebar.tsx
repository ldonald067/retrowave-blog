import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';
import { Avatar, YouTubeCard, Pepicon } from './ui';
import { Windows95Notepad, Windows98DateTime, Windows95MyComputer, Winamp as WinampIcon } from 'react-old-icons';
import { useYouTubeInfo } from '../hooks/useYouTubeInfo';
import { useTrailMode, TRAIL_MODE_OPTIONS } from './CursorSparkle';
import type { Chapter } from '../hooks/useChapters';

interface SidebarProps {
  user: SupabaseUser | null;
  profile: Profile | null;
  onEditProfile?: () => void;
  postCount?: number;
  chapters?: Chapter[];
  activeChapter?: string | null;
  onChapterSelect?: (chapter: string | null) => void;
}

export default function Sidebar({ user, profile, onEditProfile, postCount = 0, chapters = [], activeChapter = null, onChapterSelect }: SidebarProps) {
  const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return stored === null ? false : stored === 'true';
    } catch {
      return false;
    }
  });
  // Reactive AIM status — syncs when Header dispatches 'xanga-status-update'
  const [aimStatus, setAimStatus] = useState(() => {
    try { return localStorage.getItem('xanga-status') || ''; } catch { return ''; }
  });
  useEffect(() => {
    const handler = (e: Event) => setAimStatus((e as CustomEvent<string>).detail);
    window.addEventListener('xanga-status-update', handler);
    return () => window.removeEventListener('xanga-status-update', handler);
  }, []);

  const handleToggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch { /* private browsing */ }
      return next;
    });
  };

  const userData = useMemo(
    () => ({
      username: user?.email?.split('@')[0] || 'guest',
      displayName: profile?.display_name || '✨ New User ✨',
      avatar:
        profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'guest'}`,
      bio: profile?.bio || 'Welcome to my journal!',
      mood: profile?.current_mood || null,
      music: profile?.current_music || null,
      memberSince: profile?.created_at
        ? new Date(profile.created_at).getFullYear().toString()
        : '2026',
    }),
    [user?.email, user?.id, profile?.display_name, profile?.avatar_url, profile?.bio, profile?.current_mood, profile?.current_music, profile?.created_at],
  );

  const ytInfo = useYouTubeInfo(userData.music);
  const [trailMode, setTrail] = useTrailMode();

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
          <h2 className="xanga-title text-xl mb-1">{userData.displayName}</h2>
          <p className="xanga-subtitle">@{userData.username}</p>
          {/* AIM-style status — reactive via custom event from Header */}
          {aimStatus && (
            <p className="aim-status mt-1">📟 ~ {aimStatus} ~</p>
          )}
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
                <span className="font-bold" style={{ color: 'var(--text-body)' }}>Current Mood:</span>
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
                <span className="flex items-center gap-1"><WinampIcon size={12} alt="" /> WINAMP</span>
                <span style={{ fontSize: '7px', opacity: 0.7 }}>v2.91</span>
              </div>
              <div className="winamp-display">
                {ytInfo?.title || userData.music}
              </div>
              <div className="winamp-progress">
                <div className="winamp-progress-bar" />
              </div>
              <div className="winamp-controls" aria-hidden="true">
                <button className="winamp-btn" tabIndex={-1}>⏮</button>
                <button className="winamp-btn" tabIndex={-1}>▶</button>
                <button className="winamp-btn" tabIndex={-1}>⏸</button>
                <button className="winamp-btn" tabIndex={-1}>⏹</button>
                <button className="winamp-btn" tabIndex={-1}>⏭</button>
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
        <p className="text-xs leading-relaxed italic" style={{ color: 'var(--text-body)' }}>{userData.bio}</p>
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
            <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>{postCount}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Windows98DateTime size={14} alt="" />
              member since:
            </span>
            <span className="font-bold" style={{ color: 'var(--accent-secondary)' }}>{userData.memberSince} ✨</span>
          </div>
        </div>
      </motion.div>

      {/* Chapters */}
      {chapters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="xanga-box p-4"
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
              className="w-full text-left px-2 py-1.5 rounded text-xs transition min-h-[44px] lg:min-h-[36px] flex items-center justify-between gap-2"
              style={{
                color: activeChapter === null ? 'var(--accent-primary)' : 'var(--text-body)',
                fontWeight: activeChapter === null ? 700 : 400,
                backgroundColor: activeChapter === null ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' : 'transparent',
              }}
            >
              <span>✨ all entries</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{postCount}</span>
            </button>
            {chapters.map((ch) => (
              <button
                key={ch.chapter}
                onClick={() => onChapterSelect?.(activeChapter === ch.chapter ? null : ch.chapter)}
                className="w-full text-left px-2 py-1.5 rounded text-xs transition min-h-[44px] lg:min-h-[36px] flex items-center justify-between gap-2"
                style={{
                  color: activeChapter === ch.chapter ? 'var(--accent-primary)' : 'var(--text-body)',
                  fontWeight: activeChapter === ch.chapter ? 700 : 400,
                  backgroundColor: activeChapter === ch.chapter ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' : 'transparent',
                }}
                aria-pressed={activeChapter === ch.chapter}
              >
                <span className="truncate">📖 {ch.chapter}</span>
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{ch.post_count}</span>
              </button>
            ))}
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
              className="xanga-button text-[10px] px-2 py-1"
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

      {/* Powered By badge (very Xanga!) */}
      <div className="text-center text-xs py-2" style={{ color: 'var(--text-muted)' }}>
        <p className="mb-1">powered by</p>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Windows95MyComputer size={20} alt="" />
        </div>
        <p className="xanga-subtitle">
          <span className="blink">✨</span> YourJournal <span className="blink">✨</span>
        </p>
      </div>
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
      <div className="hidden lg:block space-y-4">
        {sidebarContent}
      </div>
    </aside>
  );
}
