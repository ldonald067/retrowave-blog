import {
  useState,
  useEffect,
  useRef,
  FormEvent,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Avatar,
  AvatarPicker,
  Input,
  ModalCloseButton,
  ModalFooter,
  ModalFrame,
  ModalHeader,
  ModalOverlay,
  Select,
  StyledEmoji,
  Textarea,
  Pepicon,
} from './ui';
import {
  Windows95Mspaint,
  Windows95Notepad,
  Windows95WordPad,
  Windows95Configuration,
  Winamp as WinampIcon,
  VisualStudioFace,
} from 'react-old-icons';
import {
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  MOOD_SELECT_OPTIONS,
  SWIPE_DISMISS_THRESHOLD,
} from '../lib/constants';
import { THEMES, applyTheme, DEFAULT_THEME } from '../lib/themes';
import { EMOJI_STYLES, getEmojiStyle, setEmojiStyle, type EmojiStyleId } from '../lib/emojiStyles';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useBlocks } from '../hooks/useBlocks';
import { sparkleBurst, emojiRain } from '../lib/celebrations';
import { buildPublicProfileUrl } from '../lib/publicProfile';
import type { Profile } from '../types/profile';
import ConfirmDialog from './ConfirmDialog';
import PublicPageSettings from './PublicPageSettings';

// Header (~70px) + Footer (~70px) + padding = ~180px of non-scrollable modal chrome
const MODAL_CHROME_HEIGHT = 180;

type ProfileSection = 'profile' | 'vibe' | 'public' | 'safety';

const PROFILE_SECTIONS: Array<{ id: ProfileSection; label: string }> = [
  { id: 'profile', label: 'profile' },
  { id: 'vibe', label: 'vibe' },
  { id: 'public', label: 'public page' },
  { id: 'safety', label: 'safety' },
];

function getSectionTabId(section: ProfileSection): string {
  return `profile-section-tab-${section}`;
}

function getSectionPanelId(section: ProfileSection): string {
  return `profile-section-panel-${section}`;
}

function ProfileSectionPanel({
  id,
  tabbed,
  visible,
  children,
}: {
  id: ProfileSection;
  tabbed: boolean;
  visible: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={tabbed ? getSectionPanelId(id) : undefined}
      role={tabbed ? 'tabpanel' : undefined}
      aria-labelledby={tabbed ? getSectionTabId(id) : undefined}
      className="space-y-4"
      hidden={!visible}
    >
      {children}
    </div>
  );
}

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
  const [isPublic, setIsPublic] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');
  const [blockedUsers, setBlockedUsers] = useState<
    Array<{ blocked_id: string; created_at: string }>
  >([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Keep local previews reversible until the user saves.
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
    if (saving || isInitialSetup || showPublishConfirm) return;
    if (showAvatarPicker) {
      setShowAvatarPicker(false);
    } else {
      handleCancel();
    }
  }, [saving, isInitialSetup, showPublishConfirm, showAvatarPicker, handleCancel]);
  useFocusTrap(dialogRef, true, handleEscape);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setCurrentMood(profile.current_mood || '');
      setCurrentMusic(profile.current_music || '');
      setSelectedTheme(profile.theme || DEFAULT_THEME);
      setIsPublic(profile.is_public ?? false);
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

  useEffect(() => {
    if (activeSection === 'safety' && !blockedLoading && blockedUsers.length === 0) {
      setActiveSection('profile');
    }
  }, [activeSection, blockedLoading, blockedUsers.length]);

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

    if (!validate()) {
      setActiveSection('profile');
      return;
    }

    setSaving(true);

    const updates: Partial<Profile> = {
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      theme: selectedTheme,
      current_mood: currentMood.trim() || null,
      current_music: currentMusic.trim() || null,
      is_public: isPublic,
    };

    const { error } = await onSave(updates);

    setSaving(false);

    if (error) {
      onError?.(error);
    } else {
      sparkleBurst();
      emojiRain(['✨', '💕', '⭐', '🌈'], 10);
      onSuccess?.(SUCCESS_MESSAGES.profile.updated);
      onClose();
    }
  };

  const handleAvatarSelect = (url: string) => {
    setAvatarUrl(url);
    setShowAvatarPicker(false);
  };

  const fallbackSeed = userId || 'guest';
  const savedIsPublic = profile?.is_public ?? false;
  const publicProfileUrl = profile?.username ? buildPublicProfileUrl(profile.username) : null;
  const visibleSections = PROFILE_SECTIONS.filter(
    (section) => section.id !== 'safety' || blockedLoading || blockedUsers.length > 0
  );
  const useSectionTabs = !isInitialSetup;
  const showSection = (section: ProfileSection) => isInitialSetup || activeSection === section;
  const modalChromeHeight = isInitialSetup ? MODAL_CHROME_HEIGHT : MODAL_CHROME_HEIGHT + 56;

  const focusSection = useCallback((section: ProfileSection) => {
    setActiveSection(section);
    requestAnimationFrame(() => {
      document.getElementById(getSectionTabId(section))?.focus();
    });
  }, []);

  const handleSectionKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, section: ProfileSection) => {
      const currentIndex = visibleSections.findIndex((item) => item.id === section);
      if (currentIndex < 0) return;

      const lastIndex = visibleSections.length - 1;
      let nextIndex = currentIndex;

      if (event.key === 'ArrowRight') nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
      else if (event.key === 'ArrowLeft')
        nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = lastIndex;
      else return;

      event.preventDefault();
      const nextSection = visibleSections[nextIndex]?.id;
      if (nextSection) focusSection(nextSection);
    },
    [focusSection, visibleSections]
  );

  const handleCopyPublicUrl = () => {
    if (!publicProfileUrl) return;
    void navigator.clipboard.writeText(publicProfileUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <AnimatePresence>
      <ModalOverlay onClick={isInitialSetup ? undefined : handleCancel}>
        <ModalFrame
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.5 }}
          dragSnapToOrigin
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_DISMISS_THRESHOLD && !isInitialSetup && !saving) {
              handleCancel();
            }
          }}
          className="max-w-lg max-h-[95vh] sm:max-h-[90vh]"
        >
          <ModalHeader>
            <div className="flex items-center justify-between">
              <h2 className="xanga-title text-lg sm:text-2xl flex items-center gap-2">
                ✨ {isInitialSetup ? '~ welcome! set up ur profile ~' : '~ edit profile ~'}
              </h2>
              {!isInitialSetup && <ModalCloseButton onClick={handleCancel} />}
            </div>
            <p className="xanga-subtitle mt-1">
              {isInitialSetup ? '~ tell us a bit about urself ~' : '~ customize ur space ~'}
            </p>
          </ModalHeader>

          {!isInitialSetup && (
            <div
              className="px-3 sm:px-4 py-2 border-b-2 border-dotted overflow-x-auto"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 40%, var(--modal-bg))',
                borderColor: 'var(--border-primary)',
              }}
            >
              <div
                className="grid grid-flow-col auto-cols-max gap-2"
                role="tablist"
                aria-label="Profile settings sections"
              >
                {visibleSections.map((section) => {
                  const selected = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      id={getSectionTabId(section.id)}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={getSectionPanelId(section.id)}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActiveSection(section.id)}
                      onKeyDown={(event) => handleSectionKeyDown(event, section.id)}
                      className="rounded border-2 border-dotted px-3 py-2 text-xs font-bold transition min-h-[44px] whitespace-nowrap"
                      style={{
                        backgroundColor: selected
                          ? 'color-mix(in srgb, var(--accent-primary) 16%, var(--card-bg))'
                          : 'var(--card-bg)',
                        borderColor: selected ? 'var(--accent-primary)' : 'var(--border-primary)',
                        color: selected ? 'var(--accent-primary)' : 'var(--text-body)',
                        fontFamily: 'var(--title-font)',
                      }}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content — maxHeight = viewport minus header + footer chrome */}
          <div
            className="overflow-y-auto keyboard-safe-scroll"
            style={{
              maxHeight: `calc(95vh - ${modalChromeHeight}px)`,
              backgroundColor: 'var(--modal-bg)',
            }}
          >
            <fieldset disabled={saving}>
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <ProfileSectionPanel
                  id="profile"
                  tabbed={useSectionTabs}
                  visible={showSection('profile')}
                >
                  {/* Avatar Section */}
                  <div className="xanga-box p-4">
                    <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                      <Windows95Mspaint size={20} alt="" />
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
                      <Windows95Notepad size={20} alt="" />
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
                      <Windows95WordPad size={20} alt="" />
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
                </ProfileSectionPanel>

                <ProfileSectionPanel
                  id="vibe"
                  tabbed={useSectionTabs}
                  visible={showSection('vibe')}
                >
                  {/* Current Mood */}
                  <div className="xanga-box p-4">
                    <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                      <VisualStudioFace size={20} alt="" />
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
                      <WinampIcon size={20} alt="" />
                      currently listening 2
                    </h3>
                    <Input
                      type="text"
                      value={currentMusic}
                      onChange={(e) => setCurrentMusic(e.target.value)}
                      placeholder="song, artist, or youtube link..."
                      maxLength={200}
                    />
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      what's on ur playlist rn?
                    </p>
                  </div>

                  {/* Theme Picker */}
                  <div className="xanga-box p-4">
                    <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                      <Windows95Configuration size={20} alt="" />
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
                            backgroundColor:
                              selectedTheme === theme.id
                                ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--card-bg))'
                                : 'var(--card-bg)',
                            borderColor:
                              selectedTheme === theme.id
                                ? 'var(--accent-primary)'
                                : 'var(--border-primary)',
                            transform: selectedTheme === theme.id ? 'scale(1.02)' : 'scale(1)',
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {theme.previewColors.map((color, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded-full"
                                style={{
                                  backgroundColor: color,
                                  border: '1px solid var(--border-primary)',
                                }}
                              />
                            ))}
                          </div>
                          <p
                            className="text-xs font-bold"
                            style={{ color: 'var(--text-body)', fontFamily: 'var(--title-font)' }}
                          >
                            {theme.name}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {theme.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Emoji Style Picker */}
                  <div className="xanga-box p-4">
                    <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                      <Pepicon name="stars" size={14} color="var(--accent-primary)" />
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
                            transform:
                              selectedEmojiStyle === emojiStyle.id ? 'scale(1.02)' : 'scale(1)',
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
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {emojiStyle.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </ProfileSectionPanel>

                <ProfileSectionPanel
                  id="public"
                  tabbed={useSectionTabs}
                  visible={showSection('public')}
                >
                  {/* Public Page Settings */}
                  {!isInitialSetup && (
                    <PublicPageSettings
                      enabled={isPublic}
                      savedEnabled={savedIsPublic}
                      publicUrl={publicProfileUrl}
                      copied={copiedUrl}
                      onRequestPublish={() => setShowPublishConfirm(true)}
                      onUnpublish={() => {
                        setIsPublic(false);
                        setCopiedUrl(false);
                      }}
                      onCopy={handleCopyPublicUrl}
                    />
                  )}
                </ProfileSectionPanel>

                <ProfileSectionPanel
                  id="safety"
                  tabbed={useSectionTabs}
                  visible={showSection('safety')}
                >
                  {/* Blocked Users Section */}
                  {!isInitialSetup && blockedUsers.length > 0 && (
                    <div className="xanga-box p-4">
                      <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                        <Pepicon name="shield" size={14} color="var(--accent-secondary)" />
                        blocked users
                      </h3>
                      {blockedLoading ? (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          loading...
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {blockedUsers.map((block) => (
                            <div
                              key={block.blocked_id}
                              className="flex items-center justify-between p-2 rounded"
                              style={{
                                backgroundColor:
                                  'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
                              }}
                            >
                              <span
                                className="text-xs truncate"
                                style={{ color: 'var(--text-body)' }}
                              >
                                {block.blocked_id.substring(0, 8)}...
                              </span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={async () => {
                                  const { error } = await toggleBlock(block.blocked_id);
                                  if (error) {
                                    onError?.(error);
                                  } else {
                                    setBlockedUsers((prev) =>
                                      prev.filter((b) => b.blocked_id !== block.blocked_id)
                                    );
                                    onSuccess?.(SUCCESS_MESSAGES.block.unblocked);
                                  }
                                }}
                                className="text-xs px-2 py-1 min-h-[44px] flex items-center rounded transition hover:opacity-80"
                                style={{
                                  backgroundColor:
                                    'color-mix(in srgb, var(--accent-secondary) 20%, var(--card-bg))',
                                  color: 'var(--accent-secondary)',
                                }}
                              >
                                ~ unblock ~
                              </motion.button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </ProfileSectionPanel>

                {/* Preview Section */}
                <div className="xanga-box p-4" hidden={!showSection('profile')}>
                  <h3 className="xanga-title text-base sm:text-lg mb-3">~ preview ~</h3>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Avatar src={avatarUrl} alt="Preview" size="lg" fallbackSeed={fallbackSeed} />
                    <div className="flex-1 min-w-0">
                      <h4 className="xanga-title text-lg sm:text-xl truncate">
                        {displayName || '✨ new user ✨'}
                      </h4>
                      <p
                        className="text-xs mt-1 italic line-clamp-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
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
              </form>
            </fieldset>
          </div>

          <ModalFooter className="flex justify-end gap-2">
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
              <Pepicon name="floppyDisk" size={14} />
              {saving ? 'saving...' : isInitialSetup ? "~ let's go! ~" : '~ save changes ~'}
            </button>
          </ModalFooter>
        </ModalFrame>

        {showPublishConfirm && (
          <ConfirmDialog
            title="publish public page?"
            message={
              <div className="space-y-2">
                <p>This creates a public page for entries you mark public.</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Private entries and private chapters stay hidden. Anyone with the link can view
                  public entries after you save.
                </p>
              </div>
            }
            confirmLabel="publish page"
            cancelLabel="keep private"
            onConfirm={() => {
              setIsPublic(true);
              setShowPublishConfirm(false);
            }}
            onCancel={() => setShowPublishConfirm(false)}
          />
        )}
      </ModalOverlay>
    </AnimatePresence>
  );
}
