import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  Input,
  ModalCloseButton,
  ModalFooter,
  ModalFrame,
  ModalHeader,
  ModalOverlay,
  Textarea,
  Select,
  YouTubeCard,
  Pepicon,
} from './ui';
import ConfirmDialog from './ConfirmDialog';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useYouTubeInfo } from '../hooks/useYouTubeInfo';
import type { Chapter } from '../hooks/useChapters';
import type { Post, CreatePostInput } from '../types/post';
import { MOOD_SELECT_OPTIONS, SWIPE_DISMISS_THRESHOLD } from '../lib/constants';
import { quickContentCheck } from '../lib/moderation';
import { POST_LIMITS } from '../lib/validation';

interface PostModalProps {
  post?: Post | null;
  onSave: (postData: CreatePostInput) => Promise<void>;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'view';
  /** Current user id for account-scoped draft storage. */
  draftUserId?: string | null;
  /** Fetches a post with full content for view/edit modes. */
  fetchFullPost?: (id: string) => Promise<Post | null>;
  /** Existing chapters for autocomplete — passed from App to avoid duplicate RPC calls. */
  chapters?: Chapter[];
  /** Owner-only: delete the current post. */
  onDelete?: (post: Post) => void;
  /** Whether the current user owns this post. */
  isOwner?: boolean;
}

export default function PostModal({
  post,
  onSave,
  onClose,
  mode = 'create',
  draftUserId,
  fetchFullPost,
  chapters = [],
  onDelete,
  isOwner,
}: PostModalProps) {
  const draftStorageKey = draftUserId ? `post-draft:${draftUserId}` : null;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [chapter, setChapter] = useState('');
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [chapterHighlight, setChapterHighlight] = useState(-1);
  const [mood, setMood] = useState('');
  const [music, setMusic] = useState('');
  const existingChapters = chapters;
  const [isPrivate, setIsPrivate] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  // Full content is fetched only when the list row is truncated.
  const [fullContent, setFullContent] = useState<string | undefined>(undefined);
  const [loadingFullContent, setLoadingFullContent] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draftRestoredTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Check if the form has unsaved changes
  const isDirty = useCallback(() => {
    if (loadingFullContent || mode === 'view') return false;
    const baseContent = fullContent ?? post?.content ?? '';
    return mode === 'create'
      ? !!(title.trim() || content.trim())
      : !!post &&
          (title !== (post.title || '') ||
            content !== baseContent ||
            author !== (post.author || '') ||
            chapter !== (post.chapter || '') ||
            mood !== (post.mood || '') ||
            music !== (post.music || '') ||
            isPrivate !== (post.is_private ?? false));
  }, [
    loadingFullContent,
    mode,
    title,
    content,
    author,
    chapter,
    mood,
    music,
    isPrivate,
    post,
    fullContent,
  ]);

  // Check for unsaved changes before closing.
  const handleClose = useCallback(() => {
    if (saving) return;
    if (isDirty()) {
      setShowUnsavedConfirm(true);
      return;
    }
    onClose();
  }, [saving, isDirty, onClose]);
  useFocusTrap(dialogRef, true, handleClose);

  // Restore draft on mount (create mode only)
  useEffect(() => {
    if (mode === 'create' && draftStorageKey) {
      try {
        const raw = localStorage.getItem(draftStorageKey);
        if (raw) {
          const draft = JSON.parse(raw) as Record<string, string>;
          if (draft.title) setTitle(draft.title);
          if (draft.content) setContent(draft.content);
          if (draft.author) setAuthor(draft.author);
          if (draft.chapter) setChapter(draft.chapter);
          if (draft.mood) setMood(draft.mood);
          if (draft.music) setMusic(draft.music);
          setDraftRestored(true);
          // Auto-dismiss the restored banner after 3s (cleaned up on unmount)
          draftRestoredTimerRef.current = setTimeout(() => setDraftRestored(false), 3000);
        }
      } catch {
        // Ignore malformed draft
      }
    }
    return () => {
      if (draftRestoredTimerRef.current) clearTimeout(draftRestoredTimerRef.current);
    };
  }, [draftStorageKey, mode]);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      // Wait for full content before editing a truncated entry.
      if (mode === 'edit' && post.content_truncated) {
        setContent('');
      } else {
        setContent(post.content || '');
      }
      setAuthor(post.author || '');
      setChapter(post.chapter || '');
      setIsPrivate(post.is_private ?? false);
      setMood(post.mood || '');
      setMusic(post.music || '');
    }
  }, [post, mode]);

  // Fetch full content for view/edit modes when content is truncated.
  useEffect(() => {
    let cancelled = false;
    setFullContent(undefined);
    if (mode !== 'create' && post?.content_truncated && fetchFullPost) {
      setLoadingFullContent(true);
      fetchFullPost(post.id)
        .then((fullPost) => {
          if (cancelled) return;
          if (fullPost) {
            setFullContent(fullPost.content);
            // In edit mode, populate the textarea once full content arrives
            if (mode === 'edit') {
              setContent(fullPost.content || '');
            }
          } else {
            // Fetch failed — fall back to truncated content so the user
            // doesn't see an empty textarea and accidentally overwrite their post.
            if (mode === 'edit') {
              setContent(post.content || '');
            }
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingFullContent(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [mode, post?.id, post?.content_truncated, fetchFullPost]);

  // Auto-save draft (create mode only) — debounced 500ms
  useEffect(() => {
    if (mode !== 'create' || !draftStorageKey) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      // Only save if there's meaningful content
      if (title || content) {
        try {
          localStorage.setItem(
            draftStorageKey,
            JSON.stringify({ title, content, author, chapter, mood, music })
          );
        } catch {
          // Private browsing or storage quota exceeded — draft lives in React state
        }
      } else {
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // Ignore storage cleanup failures in restricted environments
        }
      }
    }, 500);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [title, content, author, chapter, mood, music, mode, draftStorageKey]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModerationError(null);
    setSaving(true);

    // Run content moderation check
    const moderationResult = quickContentCheck(
      `${title} ${content}${chapter ? ` ${chapter}` : ''}`
    );
    if (!moderationResult.allowed) {
      setModerationError(moderationResult.reason || 'Content violates community guidelines');
      setSaving(false);
      return;
    }

    const postData: CreatePostInput = {
      title,
      content,
      author: author || 'Anonymous',
      chapter: chapter.trim() || null,
      mood,
      music,
      is_private: isPrivate,
    };

    try {
      await onSave(postData);
      // Clear draft on successful save
      try {
        if (draftStorageKey) {
          localStorage.removeItem(draftStorageKey);
        }
        localStorage.removeItem('post-draft');
      } catch {
        // Private browsing — ignore
      }
    } catch {
      // Error already shown by App.tsx (toast). Keep modal open so user can
      // revise. Draft is preserved since we only clear it on success above.
    } finally {
      setSaving(false);
    }
  };

  const isViewMode = mode === 'view';
  const privacyLabel = isPrivate ? 'private' : 'public';
  const privacyDetail = isPrivate
    ? 'Only you can see this entry.'
    : 'Can appear on your public page.';

  // Close more menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  // YouTube info for view mode — hook called unconditionally, returns null when not applicable
  const viewModeYtInfo = useYouTubeInfo(isViewMode ? post?.music : null);

  return (
    <AnimatePresence>
      <ModalOverlay style={{ perspective: 1200 }} onClick={handleClose}>
        <ModalFrame
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={
            isViewMode ? `Viewing: ${title}` : mode === 'edit' ? 'Edit entry' : 'New entry'
          }
          initial={{ scale: 0.9, y: 30, rotateX: 6, opacity: 0 }}
          animate={{ scale: 1, y: 0, rotateX: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 30, rotateX: 6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.5 }}
          dragSnapToOrigin
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_DISMISS_THRESHOLD) {
              handleClose();
            }
          }}
          className="max-w-3xl flex flex-col"
        >
          <ModalHeader>
            <div className="flex items-center justify-between">
              <h2 className="xanga-title glitter-text text-xl sm:text-2xl min-w-0 pr-2">
                {isViewMode ? (
                  <span className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true">✨</span>
                    <span className="min-w-0 break-words">{post?.title}</span>
                  </span>
                ) : mode === 'edit' ? (
                  '✏️ ~ edit entry ~'
                ) : (
                  '✨ ~ new entry ~'
                )}
              </h2>
              {isViewMode && <ModalCloseButton onClick={handleClose} label="Close modal" />}
              {!isViewMode && (
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu((p) => !p)}
                    aria-label="More options"
                    aria-expanded={showMoreMenu}
                    aria-haspopup="true"
                    className="p-2 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span className="text-lg font-bold leading-none">⋮</span>
                  </button>
                  {showMoreMenu && (
                    <div
                      className="absolute right-0 top-full mt-1 z-50 rounded-lg border-2 border-dotted overflow-hidden min-w-[180px] shadow-lg"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--border-primary)',
                      }}
                      role="menu"
                    >
                      <button
                        role="menuitem"
                        onClick={() => {
                          setIsPrivate((p) => !p);
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold flex items-center gap-2 transition hover:opacity-80 min-h-[44px]"
                        style={{ color: 'var(--text-body)', fontFamily: 'var(--title-font)' }}
                      >
                        {isPrivate ? '🔓' : '🔒'} {isPrivate ? 'make public' : 'make private'}
                      </button>
                      {mode === 'edit' && isOwner && onDelete && post && (
                        <button
                          role="menuitem"
                          onClick={() => {
                            setShowMoreMenu(false);
                            onDelete(post);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold flex items-center gap-2 transition hover:opacity-80 min-h-[44px] border-t border-dotted"
                          style={{
                            color: 'var(--accent-secondary)',
                            borderColor: 'var(--border-primary)',
                            fontFamily: 'var(--title-font)',
                          }}
                        >
                          🗑️ delete entry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ModalHeader>

          {/* Content — flex-1 fills remaining space between header and footer */}
          <div
            className="overflow-y-auto keyboard-safe-scroll flex-1 min-h-0"
            style={{
              backgroundColor: 'var(--modal-bg)',
            }}
          >
            {isViewMode ? (
              <div className="p-4 sm:p-6">
                {post?.mood && (
                  <div className="xanga-box p-3 mb-3">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      current mood:{' '}
                    </span>
                    <span className="text-sm">{post.mood}</span>
                  </div>
                )}

                {post?.chapter && (
                  <div className="mb-3">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border-2 border-dotted"
                      style={{
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        backgroundColor:
                          'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                      }}
                    >
                      📖 {post.chapter}
                    </span>
                  </div>
                )}

                {post?.music && (
                  <div
                    className="xanga-box p-3 mb-3"
                    style={{ borderColor: 'var(--accent-secondary)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      🎵 currently listening 2:{' '}
                    </span>
                    {viewModeYtInfo ? (
                      <div className="mt-2">
                        <YouTubeCard ytInfo={viewModeYtInfo} />
                      </div>
                    ) : (
                      <span className="text-xs italic" style={{ color: 'var(--accent-secondary)' }}>
                        {post.music}
                      </span>
                    )}
                  </div>
                )}

                {post?.author && (
                  <p
                    className="text-sm mb-4 font-bold"
                    style={{ color: 'var(--accent-primary)', fontFamily: 'var(--title-font)' }}
                  >
                    ~ {post.author}
                  </p>
                )}

                <div
                  className="prose prose-sm sm:prose max-w-none"
                  style={{ color: 'var(--text-body)' }}
                >
                  {loadingFullContent ? (
                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                      loading full entry...
                    </p>
                  ) : (
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                      {fullContent ?? post?.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ) : (
              <fieldset disabled={saving || loadingFullContent}>
                <form
                  onSubmit={handleSubmit}
                  className="p-4 sm:p-6 space-y-4"
                  aria-busy={saving || loadingFullContent}
                >
                  {/* Draft Restored Banner */}
                  <AnimatePresence>
                    {draftRestored && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="xanga-box p-2 text-center"
                        style={{ borderColor: 'var(--accent-primary)' }}
                      >
                        <p
                          className="text-xs"
                          style={{
                            color: 'var(--accent-primary)',
                            fontFamily: 'var(--title-font)',
                          }}
                        >
                          ✨ draft restored from last time!
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Moderation Error Alert */}
                  {moderationError && (
                    <div
                      role="alert"
                      className="xanga-box p-3"
                      style={{ borderColor: 'var(--accent-secondary)' }}
                    >
                      <p
                        className="text-xs font-bold mb-1"
                        style={{
                          color: 'var(--accent-secondary)',
                          fontFamily: 'var(--title-font)',
                        }}
                      >
                        ❌ content not allowed
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-body)' }}>
                        {moderationError}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        pls revise ur post 2 comply w/ our community guidelines
                      </p>
                    </div>
                  )}

                  <div className="xanga-box p-3 sm:p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="xanga-title text-base flex items-center gap-2">
                          {isPrivate ? '🔒' : '🔓'} entry privacy
                        </h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {privacyDetail}
                        </p>
                      </div>
                      <span
                        className="inline-flex w-fit rounded border px-2 py-1 text-xs font-bold"
                        style={{
                          borderColor: isPrivate
                            ? 'var(--border-primary)'
                            : 'var(--accent-primary)',
                          color: isPrivate ? 'var(--text-muted)' : 'var(--accent-primary)',
                          backgroundColor: isPrivate
                            ? 'var(--card-bg)'
                            : 'color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg))',
                        }}
                      >
                        {privacyLabel}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-pressed={isPrivate}
                        onClick={() => setIsPrivate(true)}
                        className="rounded border-2 border-dotted px-3 py-2 text-xs font-bold transition min-h-[44px]"
                        style={{
                          backgroundColor: isPrivate
                            ? 'color-mix(in srgb, var(--accent-primary) 14%, var(--card-bg))'
                            : 'var(--card-bg)',
                          borderColor: isPrivate
                            ? 'var(--accent-primary)'
                            : 'var(--border-primary)',
                          color: isPrivate ? 'var(--accent-primary)' : 'var(--text-body)',
                          fontFamily: 'var(--title-font)',
                        }}
                      >
                        private
                      </button>
                      <button
                        type="button"
                        aria-pressed={!isPrivate}
                        onClick={() => setIsPrivate(false)}
                        className="rounded border-2 border-dotted px-3 py-2 text-xs font-bold transition min-h-[44px]"
                        style={{
                          backgroundColor: !isPrivate
                            ? 'color-mix(in srgb, var(--accent-primary) 14%, var(--card-bg))'
                            : 'var(--card-bg)',
                          borderColor: !isPrivate
                            ? 'var(--accent-primary)'
                            : 'var(--border-primary)',
                          color: !isPrivate ? 'var(--accent-primary)' : 'var(--text-body)',
                          fontFamily: 'var(--title-font)',
                        }}
                      >
                        public
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <Input
                      label="entry title: *"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="what's on ur mind 2day?"
                      required
                      maxLength={200}
                      aria-required="true"
                    />
                    <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
                      {title.length}/200
                    </p>
                  </div>

                  {/* Chapter (optional) */}
                  <div className="relative">
                    <Input
                      label="📖 chapter (optional):"
                      value={chapter}
                      onChange={(e) => {
                        setChapter(e.target.value);
                        setChapterHighlight(-1);
                      }}
                      onFocus={() => {
                        setShowChapterPicker(true);
                        setChapterHighlight(-1);
                      }}
                      onBlur={() => setTimeout(() => setShowChapterPicker(false), 150)}
                      onKeyDown={(e) => {
                        if (!showChapterPicker) return;
                        const filtered = existingChapters.filter(
                          (c) => !chapter || c.chapter.toLowerCase().includes(chapter.toLowerCase())
                        );
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setChapterHighlight((prev) => Math.min(prev + 1, filtered.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setChapterHighlight((prev) => Math.max(prev - 1, -1));
                        } else if (
                          e.key === 'Enter' &&
                          chapterHighlight >= 0 &&
                          filtered[chapterHighlight]
                        ) {
                          e.preventDefault();
                          setChapter(filtered[chapterHighlight].chapter);
                          setShowChapterPicker(false);
                          setChapterHighlight(-1);
                        } else if (e.key === 'Escape') {
                          setShowChapterPicker(false);
                          setChapterHighlight(-1);
                        }
                      }}
                      placeholder="name a chapter for this entry..."
                      maxLength={POST_LIMITS.chapter.max}
                      role="combobox"
                      aria-expanded={showChapterPicker && existingChapters.length > 0}
                      aria-autocomplete="list"
                      aria-controls="chapter-listbox"
                      aria-activedescendant={
                        chapterHighlight >= 0 ? `chapter-option-${chapterHighlight}` : undefined
                      }
                    />
                    {/* Chapter autocomplete dropdown */}
                    <AnimatePresence>
                      {showChapterPicker && existingChapters.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          id="chapter-listbox"
                          role="listbox"
                          aria-label="Existing chapters"
                          className="absolute z-10 left-0 right-0 mt-1 rounded-lg border-2 border-dotted overflow-hidden max-h-[140px] overflow-y-auto"
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            borderColor: 'var(--border-primary)',
                          }}
                        >
                          {existingChapters
                            .filter(
                              (c) =>
                                !chapter || c.chapter.toLowerCase().includes(chapter.toLowerCase())
                            )
                            .map((c, idx) => (
                              <button
                                key={c.chapter}
                                id={`chapter-option-${idx}`}
                                type="button"
                                role="option"
                                aria-selected={idx === chapterHighlight}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setChapter(c.chapter);
                                  setShowChapterPicker(false);
                                  setChapterHighlight(-1);
                                }}
                                className="w-full text-left px-3 py-2 text-xs transition hover:brightness-95 min-h-[44px] lg:min-h-[36px] flex items-center justify-between gap-2"
                                style={{
                                  backgroundColor:
                                    idx === chapterHighlight
                                      ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--card-bg))'
                                      : 'var(--card-bg)',
                                  color: 'var(--text-body)',
                                }}
                              >
                                <span className="truncate">📖 {c.chapter}</span>
                                <span
                                  className="text-xs flex-shrink-0"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {c.post_count} {c.post_count === 1 ? 'entry' : 'entries'}
                                </span>
                              </button>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Author + Mood row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="ur name:"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="anonymous"
                      maxLength={50}
                    />
                    <Select
                      label="current mood:"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder="select a mood..."
                      options={MOOD_SELECT_OPTIONS}
                      aria-label="Select your current mood"
                    />
                  </div>

                  {/* Music */}
                  <div>
                    <Input
                      label="🎵 currently listening 2:"
                      value={music}
                      onChange={(e) => setMusic(e.target.value)}
                      placeholder="song, artist, or youtube link..."
                      maxLength={200}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      tip: paste a youtube link 2 share the song!
                    </p>
                  </div>

                  {loadingFullContent && (
                    <div
                      className="xanga-box p-2 text-center"
                      style={{ borderColor: 'var(--accent-primary)' }}
                    >
                      <p
                        className="text-xs"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
                      >
                        loading full entry content...
                      </p>
                    </div>
                  )}

                  {/* Content */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="post-content"
                        className="block text-xs font-bold"
                        style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
                      >
                        ur thoughts: * (markdown supported)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="xanga-link text-xs"
                      >
                        {showPreview ? '~ edit ~' : '~ preview ~'}
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {showPreview ? (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="xanga-box p-0 min-h-[200px] sm:min-h-[250px] overflow-hidden"
                        >
                          <div
                            className="p-3 border-b-2 border-dotted"
                            style={{
                              background:
                                'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
                              borderColor: 'var(--border-primary)',
                            }}
                          >
                            <h3 className="xanga-title text-lg sm:text-xl">
                              {title || 'ur title here'}
                            </h3>
                          </div>

                          <div className="p-3 sm:p-4">
                            {mood && (
                              <div
                                className="mb-3 pb-3 border-b border-dotted"
                                style={{ borderColor: 'var(--border-primary)' }}
                              >
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  current mood:{' '}
                                </span>
                                <span className="text-sm">{mood}</span>
                              </div>
                            )}

                            {music && (
                              <div
                                className="xanga-box p-2 mb-3"
                                style={{ borderColor: 'var(--accent-secondary)' }}
                              >
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  🎵 currently listening 2:{' '}
                                </span>
                                <span
                                  className="text-xs italic"
                                  style={{ color: 'var(--accent-secondary)' }}
                                >
                                  {music}
                                </span>
                              </div>
                            )}

                            <div
                              className="prose prose-sm max-w-none"
                              style={{ color: 'var(--text-body)' }}
                            >
                              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                                {content || '_start typing 2 see ur post preview..._'}
                              </ReactMarkdown>
                            </div>
                          </div>

                          <div
                            className="px-3 sm:px-4 py-2 border-t border-dotted text-xs"
                            style={{
                              backgroundColor:
                                'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
                              borderColor: 'var(--border-primary)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {author && (
                              <span
                                className="font-bold"
                                style={{
                                  color: 'var(--accent-primary)',
                                  fontFamily: 'var(--title-font)',
                                }}
                              >
                                ~ {author}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="editor"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Textarea
                            id="post-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="h-[200px] sm:h-[250px]"
                            placeholder="dear diary... 2day i..."
                            required
                            maxLength={50000}
                            charCount={{ current: content.length, max: 50000 }}
                            hint="use **bold**, *italic*, or [links](url) 4 formatting"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </form>
              </fieldset>
            )}
          </div>

          {!isViewMode && (
            <ModalFooter className="flex items-center justify-between flex-shrink-0">
              {/* Left: privacy indicator (read-only badge, toggle is in ⋮ menu) */}
              <div className="flex items-center">
                {isPrivate && (
                  <span
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{
                      color: 'var(--text-muted)',
                      backgroundColor: 'color-mix(in srgb, var(--border-primary) 20%, transparent)',
                    }}
                  >
                    🔒 private
                  </span>
                )}
              </div>
              {/* Right: cancel + save */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{
                    y: -2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    backgroundColor:
                      'color-mix(in srgb, var(--border-primary) 28%, var(--card-bg))',
                  }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-xs font-bold border-2 border-dotted min-h-[44px]"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--border-primary) 15%, var(--card-bg))',
                    color: 'var(--text-body)',
                    borderColor: 'var(--border-primary)',
                    fontFamily: 'var(--title-font)',
                  }}
                >
                  cancel
                </motion.button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || loadingFullContent}
                  className="xanga-button flex items-center gap-2 text-sm min-h-[44px]"
                >
                  <Pepicon name="floppyDisk" size={14} />
                  <span>
                    {saving ? 'saving...' : loadingFullContent ? 'loading...' : '~ save entry ~'}
                  </span>
                </button>
              </div>
            </ModalFooter>
          )}
        </ModalFrame>

        {/* Styled unsaved-changes confirmation (replaces raw window.confirm) */}
        {showUnsavedConfirm && (
          <ConfirmDialog
            title="~ unsaved changes ~"
            message="u have unsaved changes! r u sure u want 2 leave?"
            confirmLabel="~ yes, discard ~"
            onConfirm={() => {
              setShowUnsavedConfirm(false);
              onClose();
            }}
            onCancel={() => setShowUnsavedConfirm(false)}
          />
        )}
      </ModalOverlay>
    </AnimatePresence>
  );
}
