import { motion } from 'framer-motion';
import { PenLine, Home, User, Star, LogIn } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';

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

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Site title */}
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex-1">
            <h1 className="xanga-title text-3xl mb-1">✨ My Journal ✨</h1>
            <p className="xanga-subtitle">~ where my thoughts come alive ~</p>
          </motion.div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <button className="xanga-button flex items-center gap-1">
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
