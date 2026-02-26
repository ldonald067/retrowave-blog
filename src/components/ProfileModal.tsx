import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, User, FileText, Image, Palette, Heart, Music,
  Sparkles, ShieldOff, Download, Trash2,
} from 'lucide-react';
import { Avatar, AvatarPicker, Input, Textarea, Select, StyledEmoji } from './ui';
import ConfirmDialog from './ConfirmDialog';
import { VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES, MOOD_SELECT_OPTIONS } from '../lib/constants';
import { THEMES, applyTheme, DEFAULT_THEME } from '../lib/themes';
import {
  EMOJI_STYLES,
  getEmojiStyle,
  setEmojiStyle,
  type EmojiStyleId,
} from '../lib/emojiStyles';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useBlocks } from '../hooks/useBlocks';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errors';
import { hapticImpact } from '../lib/capacitor';
import type { Profile } from '../types/profile';

// Header (~70px) + Footer (~70px) + padding = ~180px of non-scrollable modal chrome
const MODAL_CHROME_HEIGHT = 180;

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
  const [selectedEmojiStyle, setSelectedEmojiStyle] = useState<EmojiStyleId>(getEmojiStyle());
  const [blockedUsers, setBlockedUsers] = useState<Array<{ blocked_id: string; created_at: string }>>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // UX: Capture initial theme/emoji to revert on cancel (preview-without-commit)
  const originalThemeRef = useRef<string>(profile?.theme || DEFAULT_THEME);
  const originalEmojiStyleRef = useRef<EmojiStyleId>(getEmojiStyle());
  const { toggleBlock, fetchBlockedUsers } = useBlocks();

  const handleCancel = useCallback(() => {
    // Revert previewed theme and emoji style changes
    applyTheme(originalThemeRef.current);
    setEmojiStyle(originalEmojiStyleRef.current);
    onClose();
  }, [onClose]);

  const handleEscape = useCallback(() => {
    if (saving || isInitialSetup) return;
    if (showAvatarPicker) {
      setShowAvatarPicker(false);
    } else {
      handleCancel();
    }
  }, [saving, isInitialSetup, showAvatarPicker, handleCancel]);
  useFocusTrap(dialogRef, true, handleEscape);

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

  // Fetch blocked users list when modal opens
  useEffect(() => {
    if (!userId) return;
    setBlockedLoading(true);
    void fetchBlockedUsers().then(({ data }) => {
      setBlockedUsers(data);
      setBlockedLoading(false);
    });
  }, [userId, fetchBlockedUsers]);

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

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc('export_user_data');
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-journal-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onSuccess?.('~ ur data has been exported! ~');
    } catch (err) {
      onError?.(toUserMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;

      await hapticImpact();

      // Sign out after account deletion — triggers auth state change
      await supabase.auth.signOut();

      onSuccess?.('~ ur account has been deleted. farewell friend ~');
      onClose();
    } catch (err) {
      onError?.(toUserMessage(err));
    } finally {
      setDeleteAccountLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
        onClick={isInitialSetup ? undefined : handleCancel}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.5 }}
          dragSnapToOrigin
          onDragEnd={(_, info) => {
            if (info.offset.x > 80 && !isInitialSetup && !saving) {
              handleCancel();
            }
          }}
          className="rounded-xl shadow-2xl max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
          style={{
            backgroundColor: 'var(--modal-bg)',
            border: '4px solid var(--modal-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-3 sm:p-4 border-b-2 border-dotted"
            style={{
              background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="xanga-title text-xl sm:text-2xl flex items-center gap-2">
                ✨ {isInitialSetup ? '~ welcome! set up ur profile ~' : '~ edit profile ~'}
              </h2>
              {!isInitialSetup && (
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <p className="xanga-subtitle mt-1">
              {isInitialSetup ? '~ tell us a bit about urself ~' : '~ customize ur space ~'}
            </p>
          </div>

          {/* Content — maxHeight = viewport minus header + footer chrome */}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: `calc(95vh - ${MODAL_CHROME_HEIGHT}px)`,
              backgroundColor: 'var(--modal-bg)',
            }}
            onTouchMove={() => {
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            }}
          >
            <fieldset disabled={saving}>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* Avatar Section */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                  <Image size={14} style={{ color: 'var(--accent-primary)' }} />
                  profile pic
                </h3>

                <AnimatePresence mode="wait">
                  {showAvatarPicker ? (
                    <motion.div
                      key="picker"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AvatarPicker
                        userId={userId}
                        onSelect={handleAvatarSelect}
                        onCancel={() => setShowAvatarPicker(false)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center gap-3"
                    >
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
                        ~ choose avatar ~
                      </button>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        click 2 pick from our avatar collection
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Display Name */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                  <User size={14} style={{ color: 'var(--accent-primary)' }} />
                  display name
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
                  placeholder="what should we call u?"
                  error={errors.displayName}
                  maxLength={VALIDATION.displayName.maxLength}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  this is how u'll appear 2 others
                </p>
              </div>

              {/* Bio */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                  <FileText size={14} style={{ color: 'var(--accent-primary)' }} />
                  about me
                </h3>
                <Textarea
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                    if (errors.bio) {
                      setErrors((prev) => ({ ...prev, bio: undefined }));
                    }
                  }}
                  placeholder="tell the world about urself... ur interests, ur dreams, ur fav song lyrics..."
                  rows={4}
                  error={errors.bio}
                  charCount={{ current: bio.length, max: VALIDATION.bio.maxLength }}
                  hint="share a bit about urself"
                />
              </div>

              {/* Current Mood */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                  <Heart size={14} style={{ color: 'var(--accent-primary)' }} />
                  current mood
                </h3>
                <Select
                  value={currentMood}
                  onChange={(e) => setCurrentMood(e.target.value)}
                  placeholder="no mood set"
                  options={MOOD_SELECT_OPTIONS}
                  aria-label="Select your current mood"
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  shows on ur sidebar - update anytime!
                </p>
              </div>

              {/* Currently Listening */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                  <Music size={14} style={{ color: 'var(--accent-secondary)' }} />
                  currently listening 2
                </h3>
                <Input
                  type="text"
                  value={currentMusic}
                  onChange={(e) => setCurrentMusic(e.target.value)}
                  placeholder="artist - song name, or paste a youtube link"
                  maxLength={200}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  what's on ur playlist rn?
                </p>
              </div>

              {/* Theme Picker */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                  <Palette size={14} style={{ color: 'var(--accent-primary)' }} />
                  theme
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setSelectedTheme(theme.id);
                        applyTheme(theme.id);
                      }}
                      aria-pressed={selectedTheme === theme.id}
                      className="p-2 sm:p-3 rounded-lg text-left transition-all border-2 border-dotted"
                      style={{
                        backgroundColor: selectedTheme === theme.id
                          ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--card-bg))'
                          : 'var(--card-bg)',
                        borderColor: selectedTheme === theme.id
                          ? 'var(--accent-primary)'
                          : 'var(--border-primary)',
                        transform: selectedTheme === theme.id ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {theme.previewColors.map((color, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                            style={{ backgroundColor: color, border: '1px solid var(--border-primary)' }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: 'var(--text-body)', fontFamily: 'var(--title-font)' }}
                      >
                        {theme.name}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{theme.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji Style Picker */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                  <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                  emoji style
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EMOJI_STYLES.map((emojiStyle) => (
                    <button
                      key={emojiStyle.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmojiStyle(emojiStyle.id);
                        setEmojiStyle(emojiStyle.id);
                      }}
                      aria-pressed={selectedEmojiStyle === emojiStyle.id}
                      className="p-2 sm:p-3 rounded-lg text-left transition-all border-2 border-dotted"
                      style={{
                        backgroundColor:
                          selectedEmojiStyle === emojiStyle.id
                            ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--card-bg))'
                            : 'var(--card-bg)',
                        borderColor:
                          selectedEmojiStyle === emojiStyle.id
                            ? 'var(--accent-primary)'
                            : 'var(--border-primary)',
                        transform: selectedEmojiStyle === emojiStyle.id ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      {/* Preview row showing 3 sample emoji */}
                      <div className="flex items-center gap-1 mb-1">
                        {['❤️', '🔥', '😂'].map((emoji) => (
                          <StyledEmoji
                            key={emoji}
                            emoji={emoji}
                            size={18}
                            overrideStyle={emojiStyle.id}
                          />
                        ))}
                      </div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: 'var(--text-body)', fontFamily: 'var(--title-font)' }}
                      >
                        {emojiStyle.name}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {emojiStyle.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Blocked Users Section */}
              {!isInitialSetup && blockedUsers.length > 0 && (
                <div className="xanga-box p-4">
                  <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                    <ShieldOff size={14} style={{ color: 'var(--accent-secondary)' }} />
                    blocked users
                  </h3>
                  {blockedLoading ? (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>loading...</p>
                  ) : (
                    <div className="space-y-2">
                      {blockedUsers.map((block) => (
                        <div
                          key={block.blocked_id}
                          className="flex items-center justify-between p-2 rounded"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))' }}
                        >
                          <span className="text-xs truncate" style={{ color: 'var(--text-body)' }}>
                            {block.blocked_id.substring(0, 8)}...
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              const { error } = await toggleBlock(block.blocked_id);
                              if (error) {
                                onError?.(error);
                              } else {
                                setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== block.blocked_id));
                                onSuccess?.(SUCCESS_MESSAGES.block.unblocked);
                              }
                            }}
                            className="text-[10px] px-2 py-1 rounded transition hover:opacity-80"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 20%, var(--card-bg))',
                              color: 'var(--accent-secondary)',
                            }}
                          >
                            unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview Section */}
              <div className="xanga-box p-4">
                <h3 className="xanga-title text-base sm:text-lg mb-3">~ preview ~</h3>
                <div className="flex items-start gap-3 sm:gap-4">
                  <Avatar src={avatarUrl} alt="Preview" size="lg" fallbackSeed={fallbackSeed} />
                  <div className="flex-1 min-w-0">
                    <h4 className="xanga-title text-lg sm:text-xl truncate">
                      {displayName || '✨ new user ✨'}
                    </h4>
                    <p className="text-xs mt-1 italic line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {bio || 'no bio yet...'}
                    </p>
                    {currentMood && (
                      <p className="text-xs mt-1" style={{ color: 'var(--accent-primary)' }}>
                        mood: {currentMood}
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

              {/* Account Actions — only show for existing users, not initial setup */}
              {!isInitialSetup && (
                <div className="xanga-box p-4 space-y-3">
                  <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                    <User size={14} style={{ color: 'var(--accent-primary)' }} />
                    account
                  </h3>

                  {/* Export My Data */}
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border-2 border-dotted transition hover:opacity-80 min-h-[44px]"
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text-body)',
                      borderColor: 'var(--border-primary)',
                      fontFamily: 'var(--title-font)',
                    }}
                  >
                    <Download size={14} />
                    {exporting ? '~ exporting... ~' : '~ export my data ~'}
                  </button>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    download all ur posts, reactions & profile as a json file
                  </p>

                  {/* Delete Account — danger zone */}
                  <div
                    className="pt-3 mt-3 border-t-2 border-dotted"
                    style={{ borderColor: 'var(--accent-secondary)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border-2 transition hover:opacity-80 min-h-[44px]"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 10%, var(--card-bg))',
                        color: 'var(--accent-secondary)',
                        borderColor: 'var(--accent-secondary)',
                        fontFamily: 'var(--title-font)',
                      }}
                    >
                      <Trash2 size={14} />
                      ~ delete account ~
                    </button>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      this will permanently delete ur account & all ur data. this can't be undone!
                    </p>
                  </div>
                </div>
              )}
            </form>
            </fieldset>
          </div>

          {/* Footer */}
          <div
            className="p-3 sm:p-4 border-t-2 border-dotted flex justify-end gap-2 modal-footer-safe"
            style={{
              background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
              borderColor: 'var(--border-primary)',
            }}
          >
            {!isInitialSetup && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 rounded-lg transition text-xs font-bold border-2 border-dotted min-h-[44px]"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-body)',
                  borderColor: 'var(--border-primary)',
                  fontFamily: 'var(--title-font)',
                }}
              >
                cancel
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="xanga-button flex items-center gap-2 text-sm"
            >
              <Save size={14} />
              {saving ? 'saving...' : isInitialSetup ? "~ let's go! ~" : '~ save changes ~'}
            </button>
          </div>
        </motion.div>

        {/* Delete Account Confirmation */}
        {showDeleteConfirm && (
          <ConfirmDialog
            title="~ delete account? ~"
            message="this will permanently delete ur account, all ur posts, reactions & data. this can NOT be undone. r u absolutely sure?"
            confirmLabel="~ yes, delete everything ~"
            loading={deleteAccountLoading}
            onConfirm={handleDeleteAccount}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
