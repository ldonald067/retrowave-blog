import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { Post, CreatePostInput } from '../types/post';
import { MOODS } from '../lib/constants';
import { quickContentCheck } from '../lib/moderation';

// Header (~60px) + Footer (~80px) = ~140px of non-scrollable modal chrome
const MODAL_CHROME_HEIGHT = 140;

interface PostModalProps {
  post?: Post | null;
  onSave: (postData: CreatePostInput) => Promise<void>;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export default function PostModal({ post, onSave, onClose, mode = 'create' }: PostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [mood, setMood] = useState('');
  const [music, setMusic] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draftRestoredTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // UX: Check for unsaved changes before closing
  const handleClose = useCallback(() => {
    if (saving) return;
    if (mode !== 'view') {
      const dirty =
        mode === 'create'
          ? !!(title.trim() || content.trim())
          : !!post &&
            (title !== (post.title || '') ||
              content !== (post.content || '') ||
              author !== (post.author || '') ||
              mood !== (post.mood || '') ||
              music !== (post.music || ''));
      if (dirty && !window.confirm('u have unsaved changes! r u sure u want 2 leave?')) {
        return;
      }
    }
    onClose();
  }, [saving, mode, title, content, author, mood, music, post, onClose]);
  useFocusTrap(dialogRef, true, handleClose);

  // Restore draft on mount (create mode only)
  useEffect(() => {
    if (mode === 'create') {
      try {
        const raw = localStorage.getItem('post-draft');
        if (raw) {
          const draft = JSON.parse(raw) as Record<string, string>;
          if (draft.title) setTitle(draft.title);
          if (draft.content) setContent(draft.content);
          if (draft.author) setAuthor(draft.author);
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
  }, [mode]);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setAuthor(post.author || '');
      setMood(post.mood || '');
      setMusic(post.music || '');
    }
  }, [post]);

  // Auto-save draft (create mode only) — debounced 500ms
  useEffect(() => {
    if (mode !== 'create') return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      // Only save if there's meaningful content
      if (title || content) {
        localStorage.setItem('post-draft', JSON.stringify({ title, content, author, mood, music }));
      }
    }, 500);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [title, content, author, mood, music, mode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModerationError(null);
    setSaving(true);

    // Run content moderation check
    const moderationResult = quickContentCheck(`${title} ${content}`);
    if (!moderationResult.allowed) {
      setModerationError(moderationResult.reason || 'Content violates community guidelines');
      setSaving(false);
      return;
    }

    const postData: CreatePostInput = {
      title,
      content,
      author: author || 'Anonymous',
      mood,
      music,
    };

    try {
      await onSave(postData);
      // Clear draft on successful save
      localStorage.removeItem('post-draft');
    } finally {
      setSaving(false);
    }
  };

  const isViewMode = mode === 'view';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
        onClick={handleClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={
            isViewMode ? `Viewing: ${title}` : mode === 'edit' ? 'Edit entry' : 'New entry'
          }
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
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
              <h2 className="xanga-title text-xl sm:text-2xl">
                {isViewMode ? (
                  <span className="flex items-center gap-2">
                    ✨ {post?.title}
                  </span>
                ) : mode === 'edit' ? (
                  '✏️ ~ edit entry ~'
                ) : (
                  '✨ ~ new entry ~'
                )}
              </h2>
              <button
                onClick={handleClose}
                aria-label="Close modal"
                className="p-2 rounded-full transition"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content — maxHeight = viewport minus header + footer chrome */}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: `calc(90vh - ${MODAL_CHROME_HEIGHT}px)`,
              backgroundColor: 'var(--modal-bg)',
            }}
          >
            {isViewMode ? (
              <div className="p-4 sm:p-6">
                {post?.mood && (
                  <div className="xanga-box p-3 mb-3">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>current mood: </span>
                    <span className="text-sm">{post.mood}</span>
                  </div>
                )}

                {post?.music && (
                  <div
                    className="xanga-box p-3 mb-3"
                    style={{ borderColor: 'var(--accent-secondary)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🎵 currently listening 2: </span>
                    <span className="text-xs italic" style={{ color: 'var(--accent-secondary)' }}>{post.music}</span>
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

                <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-body)' }}>
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{post?.content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <fieldset disabled={saving}>
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                {/* Draft Restored Banner */}
                {draftRestored && (
                  <div
                    className="xanga-box p-2 text-center"
                    style={{ borderColor: 'var(--accent-primary)' }}
                  >
                    <p className="text-xs" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--title-font)' }}>
                      ✨ draft restored from last time!
                    </p>
                  </div>
                )}

                {/* Moderation Error Alert */}
                {moderationError && (
                  <div
                    className="xanga-box p-3"
                    style={{ borderColor: 'var(--accent-secondary)' }}
                  >
                    <p
                      className="text-xs font-bold mb-1"
                      style={{ color: 'var(--accent-secondary)', fontFamily: 'var(--title-font)' }}
                    >
                      ❌ content not allowed
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-body)' }}>{moderationError}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      pls revise ur post 2 comply w/ our community guidelines
                    </p>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label
                    htmlFor="post-title"
                    className="block text-xs font-bold mb-1"
                    style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
                  >
                    entry title: *
                  </label>
                  <input
                    id="post-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition focus:outline-none"
                    style={{
                      backgroundColor: 'var(--input-bg, var(--card-bg))',
                      borderColor: 'var(--input-border, var(--border-primary))',
                      color: 'var(--text-body)',
                    }}
                    placeholder="what's on ur mind 2day?"
                    required
                    maxLength={200}
                    aria-required="true"
                  />
                  <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{title.length}/200</p>
                </div>

                {/* Author + Mood row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="post-author"
                      className="block text-xs font-bold mb-1"
                      style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
                    >
                      ur name:
                    </label>
                    <input
                      id="post-author"
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition focus:outline-none"
                      style={{
                        backgroundColor: 'var(--input-bg, var(--card-bg))',
                        borderColor: 'var(--input-border, var(--border-primary))',
                        color: 'var(--text-body)',
                      }}
                      placeholder="anonymous"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="post-mood"
                      className="block text-xs font-bold mb-1"
                      style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
                    >
                      current mood:
                    </label>
                    <select
                      id="post-mood"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition cursor-pointer focus:outline-none appearance-none"
                      style={{
                        backgroundColor: 'var(--input-bg, var(--card-bg))',
                        borderColor: 'var(--input-border, var(--border-primary))',
                        color: 'var(--text-body)',
                      }}
                      aria-label="Select your current mood"
                    >
                      <option value="">select a mood...</option>
                      {MOODS.map((m) => (
                        <option key={m.label} value={`${m.emoji} ${m.label}`}>
                          {m.emoji} {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Music */}
                <div>
                  <label
                    htmlFor="post-music"
                    className="block text-xs font-bold mb-1"
                    style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
                  >
                    🎵 currently listening 2:
                  </label>
                  <input
                    id="post-music"
                    type="text"
                    value={music}
                    onChange={(e) => setMusic(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition focus:outline-none"
                    style={{
                      backgroundColor: 'var(--input-bg, var(--card-bg))',
                      borderColor: 'var(--input-border, var(--border-primary))',
                      color: 'var(--text-body)',
                    }}
                    placeholder="song name, artist, or paste a youtube link..."
                    maxLength={200}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    tip: paste a youtube link 2 share the song!
                  </p>
                </div>

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

                  {showPreview ? (
                    <div className="xanga-box p-0 min-h-[200px] sm:min-h-[250px] overflow-hidden">
                      <div
                        className="p-3 border-b-2 border-dotted"
                        style={{
                          background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
                          borderColor: 'var(--border-primary)',
                        }}
                      >
                        <h3 className="xanga-title text-lg sm:text-xl">{title || 'ur title here'}</h3>
                      </div>

                      <div className="p-3 sm:p-4">
                        {mood && (
                          <div className="mb-3 pb-3 border-b border-dotted" style={{ borderColor: 'var(--border-primary)' }}>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>current mood: </span>
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
                            <span className="text-xs italic" style={{ color: 'var(--accent-secondary)' }}>{music}</span>
                          </div>
                        )}

                        <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-body)' }}>
                          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                            {content || '_start typing 2 see ur post preview..._'}
                          </ReactMarkdown>
                        </div>
                      </div>

                      <div
                        className="px-3 sm:px-4 py-2 border-t border-dotted text-xs"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {author && (
                          <span
                            className="font-bold"
                            style={{ color: 'var(--accent-primary)', fontFamily: 'var(--title-font)' }}
                          >
                            ~ {author}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <textarea
                      id="post-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full h-[200px] sm:h-[250px] px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition resize-none focus:outline-none"
                      style={{
                        backgroundColor: 'var(--input-bg, var(--card-bg))',
                        borderColor: 'var(--input-border, var(--border-primary))',
                        color: 'var(--text-body)',
                      }}
                      placeholder="dear diary... 2day i..."
                      required
                      maxLength={50000}
                    />
                  )}
                  <div className="flex justify-between mt-1">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      use **bold**, *italic*, or [links](url) 4 formatting
                    </p>
                    <p className="text-xs" style={{ color: content.length > 45000 ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
                      {content.length.toLocaleString()}/50,000
                    </p>
                  </div>
                </div>
              </form>
              </fieldset>
            )}
          </div>

          {/* Footer */}
          {!isViewMode && (
            <div
              className="p-3 sm:p-4 border-t-2 border-dotted flex justify-end gap-2"
              style={{
                background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
                borderColor: 'var(--border-primary)',
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg transition text-xs font-bold border-2 border-dotted"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-body)',
                  borderColor: 'var(--border-primary)',
                  fontFamily: 'var(--title-font)',
                }}
              >
                cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="xanga-button flex items-center gap-2 text-sm"
              >
                <Save size={14} />
                <span>{saving ? 'saving...' : '~ save entry ~'}</span>
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
