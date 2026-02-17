import { useState, useEffect, FormEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Sparkles, User, FileText, Image, Palette, Heart, Music } from 'lucide-react';
import { Avatar, AvatarPicker, Button, Input, Textarea } from './ui';
import { VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES, MOODS } from '../lib/constants';
import { THEMES, applyTheme, DEFAULT_THEME } from '../lib/themes';
import type { Profile } from '../types/profile';

interface ProfileModalProps {
  profile: Profile | null;
  userId?: string;
  onSave: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  isInitialSetup?: boolean;
}

export default function ProfileModal({
  profile,
  userId,
  onSave,
  onClose,
  onSuccess,
  onError,
  isInitialSetup = false,
}: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentMood, setCurrentMood] = useState('');
  const [currentMusic, setCurrentMusic] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; bio?: string }>({});
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>(DEFAULT_THEME);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setCurrentMood(profile.current_mood || '');
      setCurrentMusic(profile.current_music || '');
      setSelectedTheme(profile.theme || DEFAULT_THEME);
    }
  }, [profile]);

  // Handle escape key to close modal (disabled during initial setup)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving && !isInitialSetup) {
        if (showAvatarPicker) {
          setShowAvatarPicker(false);
        } else {
          onClose();
        }
      }
    },
    [onClose, saving, showAvatarPicker, isInitialSetup]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const validate = (): boolean => {
    const newErrors: { displayName?: string; bio?: string } = {};

    // Require display name for initial setup
    if (isInitialSetup && !displayName.trim()) {
      newErrors.displayName = 'Please enter a display name to get started';
    }

    if (displayName.length > VALIDATION.displayName.maxLength) {
      newErrors.displayName = ERROR_MESSAGES.profile.displayNameTooLong;
    }

    if (bio.length > VALIDATION.bio.maxLength) {
      newErrors.bio = ERROR_MESSAGES.profile.bioTooLong;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);

    const updates: Partial<Profile> = {
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      theme: selectedTheme,
      current_mood: currentMood.trim() || null,
      current_music: currentMusic.trim() || null,
    };

    const { error } = await onSave(updates);

    setSaving(false);

    if (error) {
      onError?.(error);
    } else {
      onSuccess?.(SUCCESS_MESSAGES.profile.updated);
      onClose();
    }
  };

  const handleAvatarSelect = (url: string) => {
    setAvatarUrl(url);
    setShowAvatarPicker(false);
  };

  const fallbackSeed = userId || 'guest';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={isInitialSetup ? undefined : onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          style={{
            backgroundColor: 'var(--modal-bg)',
            border: '4px solid var(--modal-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-4 border-b-2 border-dotted"
            style={{
              background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="xanga-title text-2xl flex items-center gap-2">
                <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
                {isInitialSetup ? 'Welcome! Set Up Your Profile' : 'Edit Profile'}
              </h2>
              {!isInitialSetup && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-full transition"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <p className="xanga-subtitle mt-1">
              {isInitialSetup ? '~ tell us a bit about yourself ~' : '~ customize your space ~'}
            </p>
          </div>

          {/* Content */}
          <div
            className="overflow-y-auto max-h-[calc(90vh-180px)]"
            style={{ backgroundColor: 'var(--modal-bg)' }}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Avatar Section */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-lg mb-4 flex items-center gap-2">
                  <Image size={16} style={{ color: 'var(--accent-primary)' }} />
                  Profile Picture
                </h3>

                {showAvatarPicker ? (
                  <AvatarPicker
                    currentUrl={avatarUrl}
                    userId={userId}
                    onSelect={handleAvatarSelect}
                    onCancel={() => setShowAvatarPicker(false)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Avatar
                      src={avatarUrl}
                      alt="Your avatar"
                      size="xl"
                      fallbackSeed={fallbackSeed}
                      editable
                      onClick={() => setShowAvatarPicker(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(true)}
                      className="xanga-button text-xs"
                    >
                      Choose Avatar
                    </button>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Click to pick from our avatar collection
                    </p>
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-lg mb-4 flex items-center gap-2">
                  <User size={16} style={{ color: 'var(--accent-primary)' }} />
                  Display Name
                </h3>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (errors.displayName) {
                      setErrors((prev) => ({ ...prev, displayName: undefined }));
                    }
                  }}
                  placeholder="What should we call you?"
                  error={errors.displayName}
                  maxLength={VALIDATION.displayName.maxLength + 10}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  This is how you'll appear to others
                </p>
              </div>

              {/* Bio */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-lg mb-4 flex items-center gap-2">
                  <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
                  About Me
                </h3>
                <Textarea
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                    if (errors.bio) {
                      setErrors((prev) => ({ ...prev, bio: undefined }));
                    }
                  }}
                  placeholder="Tell the world about yourself... your interests, your dreams, your favorite song lyrics..."
                  rows={4}
                  error={errors.bio}
                  charCount={{ current: bio.length, max: VALIDATION.bio.maxLength }}
                  hint="Share a bit about yourself"
                />
              </div>

              {/* Current Mood */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-lg mb-4 flex items-center gap-2">
                  <Heart size={16} style={{ color: 'var(--accent-primary)' }} />
                  Current Mood
                </h3>
                <select
                  value={currentMood}
                  onChange={(e) => setCurrentMood(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg transition cursor-pointer focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '2px solid var(--input-border)',
                    color: 'var(--text-body)',
                  }}
                  aria-label="Select your current mood"
                >
                  <option value="">No mood set</option>
                  {MOODS.map((m) => (
                    <option key={m.label} value={`${m.emoji} ${m.label}`}>
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Shows on your sidebar - update anytime!
                </p>
              </div>

              {/* Currently Listening */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-lg mb-4 flex items-center gap-2">
                  <Music size={16} style={{ color: 'var(--accent-secondary)' }} />
                  Currently Listening To
                </h3>
                <input
                  type="text"
                  value={currentMusic}
                  onChange={(e) => setCurrentMusic(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '2px solid var(--input-border)',
                    color: 'var(--text-body)',
                  }}
                  placeholder="Artist - Song name"
                  maxLength={200}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  What's on your playlist right now?
                </p>
              </div>

              {/* Theme Picker */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-lg mb-4 flex items-center gap-2">
                  <Palette size={16} style={{ color: 'var(--accent-primary)' }} />
                  Theme
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setSelectedTheme(theme.id);
                        applyTheme(theme.id);
                      }}
                      className="p-3 rounded-lg text-left transition-all"
                      style={{
                        backgroundColor: selectedTheme === theme.id
                          ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--card-bg))'
                          : 'var(--card-bg)',
                        border: selectedTheme === theme.id
                          ? '2px solid var(--accent-primary)'
                          : '2px solid var(--border-primary)',
                        transform: selectedTheme === theme.id ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {theme.previewColors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color, border: '1px solid var(--border-primary)' }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-body)' }}>{theme.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{theme.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Section */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-lg mb-3">Preview</h3>
                <div className="flex items-start gap-4">
                  <Avatar src={avatarUrl} alt="Preview" size="lg" fallbackSeed={fallbackSeed} />
                  <div className="flex-1 min-w-0">
                    <h4 className="xanga-title text-xl truncate">
                      {displayName || '✨ New User ✨'}
                    </h4>
                    <p className="text-xs mt-2 italic line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {bio || 'No bio yet...'}
                    </p>
                    {currentMood && (
                      <p className="text-xs mt-1" style={{ color: 'var(--accent-primary)' }}>
                        Mood: {currentMood}
                      </p>
                    )}
                    {currentMusic && (
                      <p className="text-xs mt-1" style={{ color: 'var(--accent-secondary)' }}>
                        🎵 {currentMusic}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div
            className="p-4 border-t-2 border-dotted flex justify-end gap-3"
            style={{
              background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
              borderColor: 'var(--border-primary)',
            }}
          >
            {!isInitialSetup && (
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              loading={saving}
              disabled={saving}
              onClick={handleSubmit}
              className="flex items-center gap-2"
            >
              <Save size={16} />
              {isInitialSetup ? "Let's Go!" : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
