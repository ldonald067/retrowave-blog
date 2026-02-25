import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Home, User, Star, LogIn } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';

const STATUS_KEY = 'xanga-status';

interface HeaderProps {
  onNewPost: () => void;
  user: SupabaseUser | null;
  profile: Profile | null;
  onSignOut: () => void;
  onAuthClick: () => void;
  onProfileClick?: () => void;
}

export default function Header({
  onNewPost,
  user,
  profile,
  onSignOut,
  onAuthClick,
  onProfileClick,
}: HeaderProps) {
  const [status, setStatus] = useState(() => {
    try { return localStorage.getItem(STATUS_KEY) || ''; } catch { return ''; }
  });
  const [editingStatus, setEditingStatus] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingStatus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingStatus]);

  const startEditing = () => {
    if (!user) return;
    setDraftStatus(status);
    setEditingStatus(true);
  };

  const saveStatus = () => {
    const trimmed = draftStatus.trim();
    setStatus(trimmed);
    try { localStorage.setItem(STATUS_KEY, trimmed); } catch { /* private browsing */ }
    setEditingStatus(false);
    // Notify other components (e.g. Sidebar) that the status changed
    window.dispatchEvent(new CustomEvent('xanga-status-update', { detail: trimmed }));
  };

  const cancelEdit = () => {
    setEditingStatus(false);
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b-4 shadow-md"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Marquee Banner */}
      <div className="marquee-banner" role="marquee" aria-live="off">
        <div className="marquee-banner-inner" style={{ color: 'var(--text-subtitle)', fontSize: '10px' }}>
          ~ welcome to my xanga ~ ✨ ~ thanks 4 stopping by ~ ♥ ~ have a gr8 day ~ ☆ ~ xoxo ~ ✨ ~
        </div>
      </div>

      {/* Top banner - very Xanga */}
      <div
        className="py-2 px-4"
        style={{
          background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            {user && profile ? (
              <span style={{ color: 'var(--text-muted)' }}>
                <Star size={12} className="inline" style={{ color: 'var(--accent-primary)' }} /> Welcome back,{' '}
                {profile.display_name || 'friend'}!
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>
                <Star size={12} className="inline" style={{ color: 'var(--accent-primary)' }} /> Welcome to My Journal
              </span>
            )}
          </div>
          <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
            {user ? (
              <>
                <button onClick={onAuthClick} className="transition" style={{ color: 'inherit' }}>
                  Settings
                </button>
                <span>•</span>
                <button onClick={onSignOut} className="transition" style={{ color: 'inherit' }}>
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={onAuthClick}
                className="transition font-semibold"
                style={{ color: 'inherit' }}
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AIM-style Status */}
      {user && (
        <div
          className="py-1 px-4 border-b"
          style={{
            borderColor: 'color-mix(in srgb, var(--border-primary) 50%, transparent)',
            background: 'color-mix(in srgb, var(--header-gradient-via) 30%, transparent)',
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span style={{ fontSize: '11px' }}>📟</span>
            <span className="aim-status font-bold" style={{ color: 'var(--text-muted)', fontStyle: 'normal' }}>status:</span>
            <AnimatePresence mode="wait">
              {editingStatus ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0"
                >
                  <input
                    ref={inputRef}
                    className="aim-status-edit"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveStatus();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    onBlur={saveStatus}
                    maxLength={100}
                    placeholder="what's on ur mind..."
                    aria-label="Set your status message"
                  />
                </motion.div>
              ) : (
                <motion.button
                  key="display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={startEditing}
                  className="aim-status truncate max-w-[200px] sm:max-w-[400px]"
                  title="Click to edit your status"
                  aria-label="Edit your status"
                >
                  {status ? `~ ${status} ~` : '~ set your status ~'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Site title */}
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex-1">
            <h1 className="xanga-title text-xl sm:text-3xl mb-0 sm:mb-1">✨ My Journal ✨</h1>
            <p className="xanga-subtitle hidden sm:block">~ where my thoughts come alive ~</p>
          </motion.div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="xanga-button flex items-center gap-1"
              aria-label="Scroll to top"
            >
              <Home size={14} />
              <span className="hidden sm:inline">Home</span>
            </button>

            {user ? (
              <>
                <button onClick={onProfileClick} className="xanga-button flex items-center gap-1">
                  <User size={14} />
                  <span className="hidden sm:inline">Profile</span>
                </button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onNewPost}
                  className="xanga-button flex items-center gap-1"
                >
                  <PenLine size={14} />
                  <span className="hidden sm:inline">New Entry</span>
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAuthClick}
                className="xanga-button flex items-center gap-1"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Sign In</span>
              </motion.button>
            )}
          </nav>
        </div>
      </div>

      {/* Decorative border */}
      <div
        className="h-1"
        style={{
          background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary), var(--border-primary))',
        }}
      />
    </motion.header>
  );
}
