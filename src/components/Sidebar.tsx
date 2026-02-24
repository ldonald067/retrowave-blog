import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Music, Calendar, Settings, BookOpen, Youtube, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';
import { Avatar } from './ui';
import { useYouTubeInfo } from '../hooks/useYouTubeInfo';

interface SidebarProps {
  user: SupabaseUser | null;
  profile: Profile | null;
  onEditProfile?: () => void;
  postCount?: number;
}

export default function Sidebar({ user, profile, onEditProfile, postCount = 0 }: SidebarProps) {
  const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === null ? false : stored === 'true';
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
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
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
              <button
                onClick={onEditProfile}
                className="absolute -bottom-1 -right-1 p-1.5 border-2 rounded-full shadow-md transition"
                title="Edit Profile"
                aria-label="Edit Profile"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <Settings size={12} style={{ color: 'var(--accent-primary)' }} />
              </button>
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
                <Heart size={14} style={{ color: 'var(--accent-primary)' }} />
                <span className="font-bold" style={{ color: 'var(--text-body)' }}>Current Mood:</span>
              </div>
              <div className="ml-6 mt-1" style={{ color: 'var(--text-muted)' }}>
                {userData.mood}
              </div>
            </div>
          )}

          {/* Currently Listening - from profile with YouTube support */}
          {userData.music && (
            <div
              className="p-2 rounded-lg border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 10%, var(--card-bg))',
                borderColor: 'color-mix(in srgb, var(--accent-secondary) 30%, var(--card-bg))',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Music size={14} style={{ color: 'var(--accent-secondary)' }} />
                <span className="font-bold text-xs" style={{ color: 'var(--text-body)' }}>Listening to:</span>
              </div>
              {ytInfo ? (
                <a
                  href={ytInfo.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-1.5 rounded transition hover:opacity-80 ml-1"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 15%, var(--card-bg))',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <img
                      src={ytInfo.thumbnailUrl}
                      alt={ytInfo.title || 'YouTube'}
                      className="w-14 h-10 object-cover rounded flex-shrink-0"
                      style={{ border: '1px solid var(--border-primary)' }}
                    />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {ytInfo.title ? (
                        <p
                          className="text-[10px] leading-tight line-clamp-2 font-medium"
                          style={{ color: 'var(--text-body)' }}
                          title={ytInfo.title}
                        >
                          {ytInfo.title}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Youtube size={10} style={{ color: '#ff0000' }} />
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            Loading...
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <Youtube size={8} style={{ color: '#ff0000' }} />
                        <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                          YouTube
                        </span>
                        <ExternalLink size={6} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  </div>
                </a>
              ) : (
                <div className="ml-6 text-xs italic" style={{ color: 'var(--text-muted)' }}>{userData.music}</div>
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
              <BookOpen size={12} style={{ color: 'var(--accent-primary)' }} />
              Entries:
            </span>
            <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>{postCount}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={12} style={{ color: 'var(--accent-secondary)' }} />
              Member Since:
            </span>
            <span className="font-bold" style={{ color: 'var(--accent-secondary)' }}>{userData.memberSince}</span>
          </div>
        </div>
      </motion.div>

      {/* Powered By badge (very Xanga!) */}
      <div className="text-center text-xs py-2" style={{ color: 'var(--text-muted)' }}>
        <p className="mb-1">powered by</p>
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
        <button
          onClick={handleToggleCollapsed}
          className="xanga-box w-full p-3 flex items-center gap-3"
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
        </button>

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
